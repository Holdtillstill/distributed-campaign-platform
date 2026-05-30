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
from campaign_common.tracing import context_from_payload, get_tracer, instrument_fastapi_app
from fastapi import FastAPI
from pydantic import BaseModel, Field

SERVICE_NAME = "dispatcher"
DEFAULT_NATS_URL = "nats://nats:4222"
DEFAULT_NATS_SUBJECT = "messages.dispatch"
DEFAULT_NATS_STREAM = "CAMPAIGN_MESSAGES"
DEFAULT_NATS_DURABLE = "dispatcher"
DEFAULT_RETRY_SUBJECT = "messages.dispatch.retry"
DEFAULT_DEAD_LETTER_SUBJECT = "messages.dispatch.dead_letter"
DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_PROVIDER_URL = "http://provider-simulator:8080"

configure_logging(SERVICE_NAME)
logger = get_logger(__name__)
tracer = get_tracer(__name__)


class MessageJob(BaseModel):
    message_id: str = Field(min_length=1)
    campaign_id: str = Field(min_length=1)
    recipient: str = Field(min_length=1)
    body: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)
    channel: str = "sms"
    retry_count: int = 0
    trace_context: dict[str, str] = Field(default_factory=dict)


class ProviderResult(BaseModel):
    http_status: int
    accepted: bool = False
    body: dict[str, Any] | None = None


@dataclass(frozen=True)
class DispatchOutcome:
    status: str
    should_retry: bool = False
    should_dead_letter: bool = False
    retry_count: int = 0


@dataclass(frozen=True)
class NatsConsumerConfig:
    nats_url: str = DEFAULT_NATS_URL
    subject: str = DEFAULT_NATS_SUBJECT
    stream: str = DEFAULT_NATS_STREAM
    durable: str = DEFAULT_NATS_DURABLE
    retry_subject: str = DEFAULT_RETRY_SUBJECT
    dead_letter_subject: str = DEFAULT_DEAD_LETTER_SUBJECT
    max_attempts: int = DEFAULT_MAX_ATTEMPTS
    use_jetstream: bool = True


@dataclass(frozen=True)
class SqsConsumerConfig:
    queue_url: str
    retry_queue_url: str | None = None
    dead_letter_queue_url: str | None = None
    region_name: str | None = None
    endpoint_url: str | None = None
    max_attempts: int = DEFAULT_MAX_ATTEMPTS
    wait_time_seconds: int = 20
    max_number_of_messages: int = 10


class MessageRepository(Protocol):
    async def update_status(self, message_id: str, status: str) -> None: ...


SendToProvider = Callable[[MessageJob], Awaitable[ProviderResult]]
UpdateStatus = Callable[[str, str], Awaitable[None]]
PublishMessageJob = Callable[[dict[str, Any]], Awaitable[None]]


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
instrument_fastapi_app(app, SERVICE_NAME)


async def dependencies_ready() -> bool:
    if not _env_bool(os.getenv("READINESS_REQUIRE_DEPENDENCIES"), default=False):
        return True

    resolved_database_url = os.getenv("DATABASE_URL")
    if resolved_database_url is None:
        return False

    connection = await asyncpg.connect(dsn=resolved_database_url, timeout=2)
    try:
        await connection.fetchval("SELECT 1")
    finally:
        await connection.close()

    queue_provider = queue_provider_from_env()
    if queue_provider == "sqs":
        config = sqs_consumer_config_from_env()
        sqs_client = create_sqs_client(
            region_name=config.region_name,
            endpoint_url=config.endpoint_url,
        )
        await asyncio.to_thread(
            sqs_client.get_queue_attributes,
            QueueUrl=config.queue_url,
            AttributeNames=["QueueArn"],
        )
    elif queue_provider == "nats":
        import nats

        config = nats_consumer_config_from_env()
        nc = await nats.connect(config.nats_url, connect_timeout=2)
        await nc.drain()

    provider_url = os.getenv("PROVIDER_URL", DEFAULT_PROVIDER_URL)
    async with httpx.AsyncClient(base_url=provider_url, timeout=2.0) as client:
        response = await client.get("/readyz")
        response.raise_for_status()
    return True


add_platform_endpoints(app, service_name=SERVICE_NAME, readiness_check=dependencies_ready)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": SERVICE_NAME}


TRANSIENT_PROVIDER_STATUSES = {429, 500, 502, 503, 504}


def status_from_provider_result(result: ProviderResult) -> str:
    if result.http_status == 429:
        return MessageStatus.RETRIED.value
    if 200 <= result.http_status < 300 and result.accepted:
        return MessageStatus.SENT.value
    return MessageStatus.FAILED.value


def dispatch_outcome_from_provider_result(
    result: ProviderResult,
    *,
    retry_count: int,
    max_attempts: int,
) -> DispatchOutcome:
    next_retry_count = retry_count + 1
    if 200 <= result.http_status < 300 and result.accepted:
        return DispatchOutcome(status=MessageStatus.SENT.value, retry_count=retry_count)
    if result.http_status in TRANSIENT_PROVIDER_STATUSES:
        if next_retry_count >= max_attempts:
            return DispatchOutcome(
                status=MessageStatus.DEAD_LETTERED.value,
                should_dead_letter=True,
                retry_count=next_retry_count,
            )
        return DispatchOutcome(
            status=MessageStatus.RETRIED.value,
            should_retry=True,
            retry_count=next_retry_count,
        )
    return DispatchOutcome(status=MessageStatus.FAILED.value, retry_count=retry_count)


def retry_job_payload(job: MessageJob, *, retry_count: int) -> dict[str, Any]:
    payload = job.model_dump()
    if not payload.get("trace_context"):
        payload.pop("trace_context", None)
    payload["retry_count"] = retry_count
    return payload


async def dispatch_message(
    job: MessageJob,
    send_to_provider: SendToProvider,
    update_status: UpdateStatus,
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    publish_retry: PublishMessageJob | None = None,
    publish_dead_letter: PublishMessageJob | None = None,
) -> str:
    try:
        provider_result = await send_to_provider(job)
        outcome = dispatch_outcome_from_provider_result(
            provider_result,
            retry_count=job.retry_count,
            max_attempts=max_attempts,
        )
    except Exception:
        next_retry_count = job.retry_count + 1
        outcome = DispatchOutcome(
            status=(
                MessageStatus.DEAD_LETTERED.value
                if next_retry_count >= max_attempts
                else MessageStatus.RETRIED.value
            ),
            should_dead_letter=next_retry_count >= max_attempts,
            should_retry=next_retry_count < max_attempts,
            retry_count=next_retry_count,
        )

    await update_status(job.message_id, outcome.status)
    payload = retry_job_payload(job, retry_count=outcome.retry_count)
    if outcome.should_retry and publish_retry is not None:
        await publish_retry(payload)
    if outcome.should_dead_letter and publish_dead_letter is not None:
        await publish_dead_letter(payload)
    logger.info(
        "message_dispatched",
        message_id=job.message_id,
        campaign_id=job.campaign_id,
        status=outcome.status,
        retry_count=outcome.retry_count,
    )
    return outcome.status


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


def queue_provider_from_env(env: Mapping[str, str] | None = None) -> str:
    source = os.environ if env is None else env
    provider = source.get("QUEUE_PROVIDER", "nats").strip().lower()
    if provider in {"", "none", "noop", "disabled"}:
        return "none"
    if provider not in {"nats", "sqs"}:
        raise RuntimeError("QUEUE_PROVIDER must be one of: nats, sqs, none")
    return provider


def nats_consumer_config_from_env(env: Mapping[str, str] | None = None) -> NatsConsumerConfig:
    source = os.environ if env is None else env
    return NatsConsumerConfig(
        nats_url=source.get("NATS_URL", DEFAULT_NATS_URL),
        subject=source.get("NATS_SUBJECT", DEFAULT_NATS_SUBJECT),
        stream=source.get("NATS_STREAM", DEFAULT_NATS_STREAM),
        durable=source.get("NATS_DURABLE", DEFAULT_NATS_DURABLE),
        retry_subject=source.get("NATS_RETRY_SUBJECT", DEFAULT_RETRY_SUBJECT),
        dead_letter_subject=source.get("NATS_DEAD_LETTER_SUBJECT", DEFAULT_DEAD_LETTER_SUBJECT),
        max_attempts=int(source.get("DISPATCHER_MAX_ATTEMPTS", str(DEFAULT_MAX_ATTEMPTS))),
        use_jetstream=_env_bool(source.get("NATS_USE_JETSTREAM"), default=True),
    )


def sqs_consumer_config_from_env(env: Mapping[str, str] | None = None) -> SqsConsumerConfig:
    source = os.environ if env is None else env
    queue_url = source.get("SQS_BROADCAST_QUEUE_URL") or source.get("SQS_QUEUE_URL")
    if not queue_url:
        raise RuntimeError(
            "SQS_BROADCAST_QUEUE_URL or SQS_QUEUE_URL is required when QUEUE_PROVIDER=sqs"
        )
    return SqsConsumerConfig(
        queue_url=queue_url,
        retry_queue_url=source.get("SQS_RETRY_QUEUE_URL"),
        dead_letter_queue_url=source.get("SQS_DEAD_LETTER_QUEUE_URL"),
        region_name=source.get("AWS_REGION") or source.get("AWS_DEFAULT_REGION"),
        endpoint_url=source.get("SQS_ENDPOINT_URL"),
        max_attempts=int(source.get("DISPATCHER_MAX_ATTEMPTS", str(DEFAULT_MAX_ATTEMPTS))),
        wait_time_seconds=int(source.get("SQS_WAIT_TIME_SECONDS", "20")),
        max_number_of_messages=int(source.get("SQS_MAX_NUMBER_OF_MESSAGES", "10")),
    )


def create_sqs_client(
    *,
    region_name: str | None = None,
    endpoint_url: str | None = None,
) -> Any:
    try:
        import boto3
    except ModuleNotFoundError as exc:
        raise RuntimeError("boto3 is required when QUEUE_PROVIDER=sqs") from exc

    kwargs = {}
    if region_name:
        kwargs["region_name"] = region_name
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    return boto3.client("sqs", **kwargs)


async def ensure_stream_subjects(js: Any, *, stream: str, subjects: list[str]) -> None:
    try:
        await js.add_stream(name=stream, subjects=subjects)
    except Exception:
        await js.update_stream(name=stream, subjects=subjects)


async def run_worker(
    *,
    nats_url: str | None = None,
    subject: str | None = None,
    provider_url: str | None = None,
    database_url: str | None = None,
) -> None:
    if nats_url is not None or subject is not None or queue_provider_from_env() == "nats":
        await run_nats_worker(
            nats_url=nats_url,
            subject=subject,
            provider_url=provider_url,
            database_url=database_url,
        )
    elif queue_provider_from_env() == "sqs":
        await run_sqs_worker(provider_url=provider_url, database_url=database_url)
    else:
        await asyncio.Event().wait()


async def run_nats_worker(
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
            retry_subject=config.retry_subject,
            dead_letter_subject=config.dead_letter_subject,
            max_attempts=config.max_attempts,
            use_jetstream=config.use_jetstream,
        )
    elif subject is not None:
        config = NatsConsumerConfig(
            nats_url=config.nats_url,
            subject=subject,
            stream=config.stream,
            durable=config.durable,
            retry_subject=config.retry_subject,
            dead_letter_subject=config.dead_letter_subject,
            max_attempts=config.max_attempts,
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
    js = nc.jetstream() if config.use_jetstream else None

    async def publish_payload(subject_name: str, payload: dict[str, Any]) -> None:
        encoded = json.dumps(payload).encode("utf-8")
        if js is not None:
            await js.publish(subject_name, encoded)
        else:
            await nc.publish(subject_name, encoded)
            await nc.flush()

    async def handle_message(msg: Any) -> None:
        raw_payload = json.loads(msg.data.decode("utf-8"))
        job = MessageJob.model_validate(raw_payload)

        async def provider_sender(provider_job: MessageJob) -> ProviderResult:
            with tracer.start_as_current_span("provider.send"):
                return await send_to_provider_http(provider_job, resolved_provider_url)

        with tracer.start_as_current_span(
            "message.consume",
            context=context_from_payload(raw_payload),
        ):
            await dispatch_message(
                job,
                provider_sender,
                repository.update_status,
                max_attempts=config.max_attempts,
                publish_retry=lambda payload: publish_payload(config.retry_subject, payload),
                publish_dead_letter=lambda payload: publish_payload(
                    config.dead_letter_subject,
                    payload,
                ),
            )
        if hasattr(msg, "ack"):
            await msg.ack()

    if config.use_jetstream:
        assert js is not None
        await ensure_stream_subjects(
            js,
            stream=config.stream,
            subjects=[config.subject, config.retry_subject, config.dead_letter_subject],
        )
        await js.subscribe(
            config.subject,
            durable=config.durable,
            stream=config.stream,
            cb=handle_message,
            manual_ack=True,
        )
        await js.subscribe(
            config.retry_subject,
            durable=f"{config.durable}-retry",
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


async def send_sqs_payload(
    client: Any,
    queue_url: str,
    payload: dict[str, Any],
) -> None:
    await asyncio.to_thread(
        client.send_message,
        QueueUrl=queue_url,
        MessageBody=json.dumps(payload),
    )


async def run_sqs_worker(
    *,
    provider_url: str | None = None,
    database_url: str | None = None,
) -> None:
    config = sqs_consumer_config_from_env()
    resolved_provider_url = provider_url or os.getenv("PROVIDER_URL", DEFAULT_PROVIDER_URL)
    resolved_database_url = database_url or os.getenv("DATABASE_URL")
    if resolved_database_url is None:
        raise RuntimeError("DATABASE_URL is required to run the dispatcher worker")

    pool = await asyncpg.create_pool(dsn=resolved_database_url)
    repository = AsyncpgMessageRepository(pool)
    sqs_client = create_sqs_client(region_name=config.region_name, endpoint_url=config.endpoint_url)
    poll_queue_urls = [config.queue_url]
    if config.retry_queue_url and config.retry_queue_url != config.queue_url:
        poll_queue_urls.append(config.retry_queue_url)

    async def provider_sender(provider_job: MessageJob) -> ProviderResult:
        with tracer.start_as_current_span("provider.send"):
            return await send_to_provider_http(provider_job, resolved_provider_url)

    async def publish_retry(payload: dict[str, Any]) -> None:
        await send_sqs_payload(sqs_client, config.retry_queue_url or config.queue_url, payload)

    async def publish_dead_letter(payload: dict[str, Any]) -> None:
        if config.dead_letter_queue_url is None:
            logger.warning(
                "sqs_dead_letter_queue_not_configured",
                message_id=payload.get("message_id"),
            )
            return
        await send_sqs_payload(sqs_client, config.dead_letter_queue_url, payload)

    try:
        while True:
            received_any = False
            for queue_url in poll_queue_urls:
                response = await asyncio.to_thread(
                    sqs_client.receive_message,
                    QueueUrl=queue_url,
                    MaxNumberOfMessages=config.max_number_of_messages,
                    WaitTimeSeconds=config.wait_time_seconds,
                    MessageAttributeNames=["All"],
                    AttributeNames=["All"],
                )
                for message in response.get("Messages", []):
                    received_any = True
                    raw_payload = json.loads(message["Body"])
                    job = MessageJob.model_validate(raw_payload)
                    with tracer.start_as_current_span(
                        "message.consume",
                        context=context_from_payload(raw_payload),
                    ):
                        await dispatch_message(
                            job,
                            provider_sender,
                            repository.update_status,
                            max_attempts=config.max_attempts,
                            publish_retry=publish_retry,
                            publish_dead_letter=publish_dead_letter,
                        )
                    await asyncio.to_thread(
                        sqs_client.delete_message,
                        QueueUrl=queue_url,
                        ReceiptHandle=message["ReceiptHandle"],
                    )
            if not received_any:
                await asyncio.sleep(0.1)
    finally:
        await pool.close()


def _response_json(response: httpx.Response) -> dict[str, Any]:
    try:
        payload = response.json()
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


if __name__ == "__main__":
    asyncio.run(run_worker())
