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
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

SERVICE_NAME = "campaign-api"
DEFAULT_BODY = "Hello from distributed campaign platform"
DEFAULT_COMPANY_ID = "demo-company"
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
    company_id: str
    name: str
    message_count: int
    status_counts: dict[str, int]


class CampaignStatusResponse(BaseModel):
    id: str
    company_id: str
    name: str
    status_counts: dict[str, int]


class CompanyCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    slug: str = Field(min_length=1, pattern=r"^[a-z0-9][a-z0-9-]*[a-z0-9]$")
    admin_email: str = Field(min_length=3)


class AdminUserResponse(BaseModel):
    id: str
    email: str
    role: str


class CompanyCreateResponse(BaseModel):
    id: str
    name: str
    slug: str
    admin_user: AdminUserResponse


class MembershipResponse(BaseModel):
    company_id: str
    company_name: str
    company_slug: str
    role: str


class SubscriberListCreateRequest(BaseModel):
    name: str = Field(min_length=1)


class SubscriberListResponse(BaseModel):
    id: str
    company_id: str
    name: str
    subscriber_count: int


class SubscriberImportRequest(BaseModel):
    phone_number: str = Field(min_length=3)
    source: str = Field(min_length=1)
    list_id: str | None = None


class SubscriberResponse(BaseModel):
    id: str
    company_id: str
    phone_number: str
    marketing_status: str
    consent_status: str
    list_id: str | None = None


class DoubleOptInStartRequest(BaseModel):
    company_id: str = Field(min_length=1)
    phone_number: str = Field(min_length=3)
    source: str = Field(min_length=1)


class DoubleOptInStartResponse(BaseModel):
    subscriber_id: str
    company_id: str
    phone_number: str
    status: str
    confirmation_token: str


class DoubleOptInConfirmResponse(BaseModel):
    subscriber_id: str
    company_id: str
    phone_number: str
    status: str


class CampaignRepository(Protocol):
    async def create_campaign_with_messages(
        self,
        *,
        company_id: str,
        name: str,
        body: str,
        recipients: list[str],
    ) -> dict[str, Any]: ...

    async def get_campaign_status(self, campaign_id: str) -> dict[str, Any] | None: ...

    async def create_company_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_email: str,
    ) -> dict[str, Any]: ...

    async def list_user_memberships(self, *, email: str) -> list[dict[str, Any]]: ...

    async def create_subscriber_list(self, *, company_id: str, name: str) -> dict[str, Any]: ...

    async def import_subscriber(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        list_id: str | None,
    ) -> dict[str, Any]: ...

    async def start_double_opt_in(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]: ...

    async def confirm_double_opt_in(self, *, token: str) -> dict[str, Any] | None: ...


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
        company_id: str,
        name: str,
        body: str,
        recipients: list[str],
    ) -> dict[str, Any]:
        campaign_id = str(uuid4())
        message_rows = build_message_rows(campaign_id, recipients, body)
        await db.create_campaign_with_messages(
            self._pool,
            company_id=company_id,
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
            "company_id": company_id,
            "name": name,
            "message_count": len(message_rows),
            "status_counts": aggregate_status_counts(message_rows),
        }

    async def get_campaign_status(self, campaign_id: str) -> dict[str, Any] | None:
        return await db.get_campaign_status(self._pool, campaign_id)

    async def create_company_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_email: str,
    ) -> dict[str, Any]:
        return await db.create_company_with_admin(
            self._pool,
            name=name,
            slug=slug,
            admin_email=admin_email,
        )

    async def list_user_memberships(self, *, email: str) -> list[dict[str, Any]]:
        return await db.list_user_memberships(self._pool, email=email)

    async def create_subscriber_list(self, *, company_id: str, name: str) -> dict[str, Any]:
        return await db.create_subscriber_list(self._pool, company_id=company_id, name=name)

    async def import_subscriber(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        list_id: str | None,
    ) -> dict[str, Any]:
        return await db.import_subscriber(
            self._pool,
            company_id=company_id,
            phone_number=phone_number,
            source=source,
            list_id=list_id,
        )

    async def start_double_opt_in(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any]:
        return await db.start_double_opt_in(
            self._pool,
            company_id=company_id,
            phone_number=phone_number,
            source=source,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def confirm_double_opt_in(self, *, token: str) -> dict[str, Any] | None:
        return await db.confirm_double_opt_in(self._pool, token=token)


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
    company_id: str = Header(DEFAULT_COMPANY_ID, alias="X-Company-Id"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    recipients = request.recipients if request.recipients is not None else default_recipients()
    ensure_unique_recipients(recipients)
    result = await repository.create_campaign_with_messages(
        company_id=company_id,
        name=request.name,
        body=request.body,
        recipients=recipients,
    )
    return {
        "id": result["id"],
        "company_id": result["company_id"],
        "name": result["name"],
        "message_count": result["message_count"],
        "status_counts": result["status_counts"],
    }


@app.post(
    "/admin/companies",
    response_model=CompanyCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_customer_company(
    request: CompanyCreateRequest,
    internal_admin: str | None = Header(None, alias="X-Internal-Admin"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    if internal_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="internal admin access required",
        )
    return await repository.create_company_with_admin(
        name=request.name,
        slug=request.slug,
        admin_email=request.admin_email,
    )


@app.get("/me/memberships", response_model=list[MembershipResponse])
async def list_my_memberships(
    user_email: str | None = Header(None, alias="X-User-Email"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-Email header required",
        )
    return await repository.list_user_memberships(email=user_email)


@app.post(
    "/companies/{company_id}/subscriber-lists",
    response_model=SubscriberListResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscriber_list(
    company_id: str,
    request: SubscriberListCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    return await repository.create_subscriber_list(company_id=company_id, name=request.name)


@app.post(
    "/companies/{company_id}/subscribers",
    response_model=SubscriberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_subscriber(
    company_id: str,
    request: SubscriberImportRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    return await repository.import_subscriber(
        company_id=company_id,
        phone_number=request.phone_number,
        source=request.source,
        list_id=request.list_id,
    )


@app.post(
    "/public/opt-ins",
    response_model=DoubleOptInStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_double_opt_in(
    request: DoubleOptInStartRequest,
    http_request: Request,
    user_agent: str | None = Header(None, alias="User-Agent"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    client_host = http_request.client.host if http_request.client else None
    return await repository.start_double_opt_in(
        company_id=request.company_id,
        phone_number=request.phone_number,
        source=request.source,
        ip_address=client_host,
        user_agent=user_agent,
    )


@app.post("/public/opt-ins/{token}/confirm", response_model=DoubleOptInConfirmResponse)
async def confirm_double_opt_in(
    token: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.confirm_double_opt_in(token=token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="confirmation token not found",
        )
    return result


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
