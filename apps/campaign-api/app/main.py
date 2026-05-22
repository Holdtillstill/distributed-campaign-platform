from __future__ import annotations

import json
import os
from collections.abc import Iterable, Mapping, Sequence
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Protocol
from uuid import uuid4

import asyncpg
import db
from campaign_common.idempotency import generate_idempotency_key
from campaign_common.logging import configure_logging, get_logger
from campaign_common.models import MessageStatus
from campaign_common.observability import add_platform_endpoints
from campaign_common.tracing import get_tracer, inject_trace_context, instrument_fastapi_app
from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

SERVICE_NAME = "campaign-api"
DEFAULT_BODY = "Hello from distributed campaign platform"
STATUS_VALUES = tuple(status_value.value for status_value in MessageStatus)

configure_logging(SERVICE_NAME)
logger = get_logger(__name__)
tracer = get_tracer(__name__)


class CampaignCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    body: str = DEFAULT_BODY
    recipients: list[str] | None = None


class MessageRow(BaseModel):
    message_id: str
    campaign_id: str
    recipient: str
    body: str
    status: str
    idempotency_key: str


class CampaignCreateResponse(BaseModel):
    id: str
    name: str
    message_count: int
    status_counts: dict[str, int]


class CampaignStatusResponse(BaseModel):
    id: str
    name: str
    status_counts: dict[str, int]


class CampaignRepository(Protocol):
    async def create_campaign_with_messages(
        self,
        *,
        name: str,
        body: str,
        recipients: list[str],
    ) -> dict[str, Any]: ...

    async def get_campaign_status(self, campaign_id: str) -> dict[str, Any] | None: ...


class MessagePublisher(Protocol):
    async def publish(self, rows: Sequence[MessageRow]) -> None: ...


class NoopMessagePublisher:
    async def publish(self, rows: Sequence[MessageRow]) -> None:
        return None


@dataclass(frozen=True)
class NatsPublisherConfig:
    nats_url: str
    subject: str = "messages.dispatch"
    stream: str = "CAMPAIGN_MESSAGES"
    use_jetstream: bool = True


class NatsMessagePublisher:
    def __init__(
        self,
        nats_url: str,
        subject: str = "messages.dispatch",
        *,
        stream: str = "CAMPAIGN_MESSAGES",
        use_jetstream: bool = True,
    ) -> None:
        self.config = NatsPublisherConfig(
            nats_url=nats_url,
            subject=subject,
            stream=stream,
            use_jetstream=use_jetstream,
        )

    async def publish(self, rows: Sequence[MessageRow]) -> None:
        await publish_message_jobs(
            self.config.nats_url,
            self.config.subject,
            rows,
            stream=self.config.stream,
            use_jetstream=self.config.use_jetstream,
        )


class AsyncpgCampaignRepository:
    def __init__(self, pool: asyncpg.Pool, publisher: MessagePublisher | None = None) -> None:
        self._pool = pool
        self._publisher = publisher or NoopMessagePublisher()

    async def create_campaign_with_messages(
        self,
        *,
        name: str,
        body: str,
        recipients: list[str],
    ) -> dict[str, Any]:
        campaign_id = str(uuid4())
        message_rows = build_message_rows(campaign_id, recipients, body)
        await db.create_campaign_with_messages(
            self._pool,
            campaign_id=campaign_id,
            name=name,
            body=body,
            messages=[row.model_dump() for row in message_rows],
        )
        with tracer.start_as_current_span("nats.publish.messages.dispatch"):
            await self._publisher.publish(message_rows)
        logger.info(
            "campaign_created",
            campaign_id=campaign_id,
            message_count=len(message_rows),
        )
        return {
            "id": campaign_id,
            "name": name,
            "message_count": len(message_rows),
            "status_counts": aggregate_status_counts(message_rows),
        }

    async def get_campaign_status(self, campaign_id: str) -> dict[str, Any] | None:
        return await db.get_campaign_status(self._pool, campaign_id)


@asynccontextmanager
async def lifespan(app_instance: FastAPI):
    app_instance.state.pool = None
    yield
    pool = app_instance.state.pool
    if pool is not None:
        await pool.close()


app = FastAPI(title="Campaign API", version="0.1.0", lifespan=lifespan)
instrument_fastapi_app(app, SERVICE_NAME)
add_platform_endpoints(app, service_name=SERVICE_NAME)


async def get_pool() -> asyncpg.Pool:
    pool = app.state.pool
    if pool is None:
        pool = await asyncpg.create_pool(dsn=db.database_url_from_env())
        await db.init_db(pool)
        app.state.pool = pool
    return pool


async def get_repository() -> AsyncpgCampaignRepository:
    return AsyncpgCampaignRepository(await get_pool(), publisher_from_env())


REPOSITORY_DEPENDENCY = Depends(get_repository)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": SERVICE_NAME}


def ensure_unique_recipients(recipients: Sequence[str]) -> None:
    if len(set(recipients)) != len(recipients):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="recipients must be unique",
        )


@app.post("/campaigns", response_model=CampaignCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    request: CampaignCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    recipients = request.recipients if request.recipients is not None else default_recipients()
    ensure_unique_recipients(recipients)
    result = await repository.create_campaign_with_messages(
        name=request.name,
        body=request.body,
        recipients=recipients,
    )
    return {
        "id": result["id"],
        "name": result["name"],
        "message_count": result["message_count"],
        "status_counts": result["status_counts"],
    }


@app.get("/campaigns/{campaign_id}", response_model=CampaignStatusResponse)
async def get_campaign_status(
    campaign_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.get_campaign_status(campaign_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campaign not found")
    return result


def default_recipients() -> list[str]:
    return ["+15550001001", "+15550001002", "+15550001003"]


def build_message_rows(campaign_id: str, recipients: Sequence[str], body: str) -> list[MessageRow]:
    rows: list[MessageRow] = []
    for recipient in recipients:
        idempotency_key = generate_idempotency_key(campaign_id, recipient, body)
        message_id = generate_idempotency_key("message", idempotency_key)[:32]
        rows.append(
            MessageRow(
                message_id=message_id,
                campaign_id=campaign_id,
                recipient=recipient,
                body=body,
                status=MessageStatus.QUEUED.value,
                idempotency_key=idempotency_key,
            )
        )
    return rows


def message_job_from_row(row: MessageRow | dict[str, Any], channel: str = "sms") -> dict[str, Any]:
    message = row.model_dump() if isinstance(row, MessageRow) else row
    return inject_trace_context(
        {
            "message_id": message["message_id"],
            "campaign_id": message["campaign_id"],
            "recipient": message["recipient"],
            "body": message["body"],
            "idempotency_key": message["idempotency_key"],
            "channel": channel,
        }
    )


async def publish_message_jobs(
    nats_url: str,
    subject: str,
    rows: Sequence[MessageRow | dict[str, Any]],
    *,
    channel: str = "sms",
    stream: str = "CAMPAIGN_MESSAGES",
    use_jetstream: bool = True,
) -> None:
    import nats

    nc = await nats.connect(nats_url)
    try:
        if use_jetstream:
            js = nc.jetstream()
            try:
                await js.add_stream(name=stream, subjects=[subject])
            except Exception:
                await js.update_stream(name=stream, subjects=[subject])
            for row in rows:
                payload = json.dumps(message_job_from_row(row, channel=channel)).encode("utf-8")
                await js.publish(subject, payload)
        else:
            for row in rows:
                payload = json.dumps(message_job_from_row(row, channel=channel)).encode("utf-8")
                await nc.publish(subject, payload)
            await nc.flush()
    finally:
        await nc.drain()


def _env_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def nats_publisher_config_from_env(
    env: Mapping[str, str] | None = None,
) -> NatsPublisherConfig | None:
    source = os.environ if env is None else env
    nats_url = source.get("NATS_URL")
    if not nats_url:
        return None
    return NatsPublisherConfig(
        nats_url=nats_url,
        subject=source.get("NATS_SUBJECT", "messages.dispatch"),
        stream=source.get("NATS_STREAM", "CAMPAIGN_MESSAGES"),
        use_jetstream=_env_bool(source.get("NATS_USE_JETSTREAM"), default=True),
    )


def publisher_from_env() -> MessagePublisher:
    config = nats_publisher_config_from_env()
    if config is None:
        return NoopMessagePublisher()
    return NatsMessagePublisher(
        config.nats_url,
        config.subject,
        stream=config.stream,
        use_jetstream=config.use_jetstream,
    )


def aggregate_status_counts(messages: Iterable[dict[str, Any] | MessageRow]) -> dict[str, int]:
    counts = {status_value: 0 for status_value in STATUS_VALUES}
    for message in messages:
        status_value = message.status if isinstance(message, MessageRow) else message.get("status")
        if status_value in counts:
            counts[str(status_value)] += 1
    return counts
