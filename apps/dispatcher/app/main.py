from __future__ import annotations

import asyncio
import contextlib
import json
import os
from collections.abc import AsyncIterator, Awaitable, Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol

import asyncpg
import httpx
from campaign_common.logging import configure_logging, get_logger
from campaign_common.models import MessageStatus
from campaign_common.observability import add_platform_endpoints
from fastapi import FastAPI
from pydantic import BaseModel, Field

SERVICE_NAME = "dispatcher"
DEFAULT_NATS_URL = "nats://nats:4222"
DEFAULT_NATS_SUBJECT = "messages.dispatch"
DEFAULT_NATS_STREAM = "CAMPAIGN_MESSAGES"
DEFAULT_NATS_DURABLE = "dispatcher"
DEFAULT_PROVIDER_URL = "http://provider-simulator:8080"

configure_logging(SERVICE_NAME)
logger = get_logger(__name__)


class MessageJob(BaseModel):
    message_id: str = Field(min_length=1)
    campaign_id: str = Field(min_length=1)
    recipient: str = Field(min_length=1)
    body: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)
    channel: str = "sms"
    retry_count: int = 0


class ProviderResult(BaseModel):
    http_status: int
    accepted: bool = False
    body: dict[str, Any] | None = None


@dataclass(frozen=True)
class NatsConsumerConfig:
    nats_url: str = DEFAULT_NATS_URL
    subject: str = DEFAULT_NATS_SUBJECT
    stream: str = DEFAULT_NATS_STREAM
    durable: str = DEFAULT_NATS_DURABLE
    use_jetstream: bool = True


class MessageRepository(Protocol):
    async def update_status(self, message_id: str, status: str) -> None: ...


SendToProvider = Callable[[MessageJob], Awaitable[ProviderResult]]
UpdateStatus = Callable[[str, str], Awaitable[None]]


@contextlib.asynccontextmanager
async def lifespan(app_instance: FastAPI) -> AsyncIterator[None]:
    worker_task: asyncio.Task[None] | None = None
    if os.getenv("DISPATCHER_WORKER_ENABLED", "false").lower() == "true":
        worker_task = asyncio.create_task(run_worker())
        app_instance.state.worker_task = worker_task
    try:
        yield
    finally:
        if worker_task is not None:
            worker_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await worker_task


app = FastAPI(title="Dispatcher", version="0.1.0", lifespan=lifespan)
add_platform_endpoints(app, service_name=SERVICE_NAME)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": SERVICE_NAME}


def status_from_provider_result(result: ProviderResult) -> str:
    if result.http_status == 429:
        return MessageStatus.RETRIED.value
    if 200 <= result.http_status < 300 and result.accepted:
        return MessageStatus.SENT.value
    return MessageStatus.FAILED.value


async def dispatch_message(
    job: MessageJob,
    send_to_provider: SendToProvider,
    update_status: UpdateStatus,
) -> str:
    try:
        provider_result = await send_to_provider(job)
        status = status_from_provider_result(provider_result)
    except Exception:
        status = MessageStatus.FAILED.value

    await update_status(job.message_id, status)
    logger.info(
        "message_dispatched",
        message_id=job.message_id,
        campaign_id=job.campaign_id,
        status=status,
    )
    return status


async def send_to_provider_http(
    job: MessageJob,
    provider_url: str = DEFAULT_PROVIDER_URL,
) -> ProviderResult:
    payload = {
        "message_id": job.message_id,
        "recipient": job.recipient,
        "body": job.body,
        "channel": job.channel,
    }
    async with httpx.AsyncClient(base_url=provider_url, timeout=10.0) as client:
        response = await client.post("/send", json=payload)

    body = _response_json(response)
    accepted = response.status_code in {200, 202} and body.get("status") == "accepted"
    return ProviderResult(http_status=response.status_code, accepted=accepted, body=body)


class AsyncpgMessageRepository:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def update_status(self, message_id: str, status: str) -> None:
        async with self._pool.acquire() as connection:
            await connection.execute(
                """
                UPDATE messages
                SET status = $2, updated_at = NOW()
                WHERE id = $1
                """,
                message_id,
                status,
            )


def _env_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def nats_consumer_config_from_env(env: Mapping[str, str] | None = None) -> NatsConsumerConfig:
    source = os.environ if env is None else env
    return NatsConsumerConfig(
        nats_url=source.get("NATS_URL", DEFAULT_NATS_URL),
        subject=source.get("NATS_SUBJECT", DEFAULT_NATS_SUBJECT),
        stream=source.get("NATS_STREAM", DEFAULT_NATS_STREAM),
        durable=source.get("NATS_DURABLE", DEFAULT_NATS_DURABLE),
        use_jetstream=_env_bool(source.get("NATS_USE_JETSTREAM"), default=True),
    )


async def run_worker(
    *,
    nats_url: str | None = None,
    subject: str | None = None,
    provider_url: str | None = None,
    database_url: str | None = None,
) -> None:
    config = nats_consumer_config_from_env()
    if nats_url is not None:
        config = NatsConsumerConfig(
            nats_url=nats_url,
            subject=subject or config.subject,
            stream=config.stream,
            durable=config.durable,
            use_jetstream=config.use_jetstream,
        )
    elif subject is not None:
        config = NatsConsumerConfig(
            nats_url=config.nats_url,
            subject=subject,
            stream=config.stream,
            durable=config.durable,
            use_jetstream=config.use_jetstream,
        )
    resolved_provider_url = provider_url or os.getenv("PROVIDER_URL", DEFAULT_PROVIDER_URL)
    resolved_database_url = database_url or os.getenv("DATABASE_URL")
    if resolved_database_url is None:
        raise RuntimeError("DATABASE_URL is required to run the dispatcher worker")

    import nats

    pool = await asyncpg.create_pool(dsn=resolved_database_url)
    repository = AsyncpgMessageRepository(pool)
    nc = await nats.connect(config.nats_url)

    async def handle_message(msg: Any) -> None:
        job = MessageJob.model_validate_json(msg.data)

        async def provider_sender(provider_job: MessageJob) -> ProviderResult:
            return await send_to_provider_http(provider_job, resolved_provider_url)

        await dispatch_message(job, provider_sender, repository.update_status)
        if hasattr(msg, "ack"):
            await msg.ack()

    if config.use_jetstream:
        js = nc.jetstream()
        await js.add_stream(name=config.stream, subjects=[config.subject])
        await js.subscribe(
            config.subject,
            durable=config.durable,
            stream=config.stream,
            cb=handle_message,
            manual_ack=True,
        )
    else:
        await nc.subscribe(config.subject, cb=handle_message)
    try:
        await asyncio.Event().wait()
    finally:
        await nc.drain()
        await pool.close()


def _response_json(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


if __name__ == "__main__":
    asyncio.run(run_worker())
