from __future__ import annotations

import json
import os
from collections.abc import Iterable, Mapping, Sequence
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import date
from typing import Annotated, Any, Literal, Protocol
from uuid import uuid4

import asyncpg
import db
from campaign_common.idempotency import generate_idempotency_key
from campaign_common.logging import configure_logging, get_logger
from campaign_common.models import MessageStatus
from campaign_common.observability import add_platform_endpoints
from campaign_common.tracing import get_tracer, inject_trace_context, instrument_fastapi_app
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, status
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
    message_type: Literal["regular", "smart"] = "regular"
    recipients: list[str] | None = None
    subscriber_ids: list[str] = Field(default_factory=list)
    subscriber_list_ids: list[str] = Field(default_factory=list)
    media_asset_id: str | None = None
    scheduled_at: str | None = None


class MessageRow(BaseModel):
    message_id: str
    campaign_id: str
    recipient: str
    subscriber_id: str | None = None
    body: str
    status: str
    idempotency_key: str


class CampaignCreateResponse(BaseModel):
    id: str
    company_id: str
    name: str
    message_type: str
    status: str
    scheduled_at: str | None = None
    audience_count: int
    message_count: int
    credit_cost: int
    remaining_credits: int
    tracked_links: list[dict[str, Any]] = Field(default_factory=list)
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
    monthly_send_limit: int | None = Field(default=None, ge=0)
    credit_balance: int = Field(default=0, ge=0)


class AdminUserResponse(BaseModel):
    id: str
    email: str
    role: str


class CompanyCreateResponse(BaseModel):
    id: str
    name: str
    slug: str
    monthly_send_limit: int | None = None
    credit_balance: int
    access_code: str
    admin_user: AdminUserResponse


class MembershipResponse(BaseModel):
    company_id: str
    company_name: str
    company_slug: str
    role: str
    credit_limit: int | None = None
    credits_used: int = 0


class AccessCodeCreateRequest(BaseModel):
    role: str = "customer_admin"
    credit_limit: int | None = Field(default=None, ge=0)


class AccessCodeCreateResponse(BaseModel):
    code: str
    company_id: str
    role: str
    credit_limit: int | None = None


class AccessCodeSignupRequest(BaseModel):
    email: str = Field(min_length=3)
    name: str = Field(min_length=1)
    access_code: str = Field(min_length=3)


class AccessCodeSignupResponse(BaseModel):
    role: Literal["company_user"]
    email: str
    company_id: str
    company_name: str
    membership_role: str
    credit_limit: int | None = None


class CompanyDashboardSummaryResponse(BaseModel):
    company_id: str
    company_name: str
    monthly_send_limit: int | None = None
    credit_balance: int
    subscriber_count: int
    campaign_count: int
    message_count: int
    credits_used: int
    click_count: int
    redemption_count: int


class AdminDashboardSummaryResponse(BaseModel):
    company_count: int
    active_company_count: int
    total_credit_balance: int
    active_access_code_count: int


class CompanyUserResponse(BaseModel):
    user_id: str
    email: str
    display_name: str | None = None
    role: str
    credit_limit: int | None = None
    credits_used: int


class CompanyUserUpdateRequest(BaseModel):
    role: str
    credit_limit: int | None = Field(default=None, ge=0)


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


class CampaignListItemResponse(BaseModel):
    id: str
    company_id: str
    name: str
    message_type: str
    status: str
    scheduled_at: Any | None = None
    created_at: Any | None = None
    message_count: int
    credit_cost: int
    reminder_count: int


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


class MediaAssetCreateRequest(BaseModel):
    filename: str = Field(min_length=1)
    content_type: str = Field(min_length=1)
    url: str = Field(min_length=1)


class MediaAssetResponse(BaseModel):
    id: str
    company_id: str | None = None
    filename: str
    content_type: str
    url: str
    created_at: Any | None = None


class CampaignLinkCreateRequest(BaseModel):
    campaign_id: str = Field(min_length=1)
    subscriber_id: str | None = None
    media_asset_id: str | None = None
    destination_url: str | None = None


class CampaignLinkResponse(BaseModel):
    id: str
    token: str
    company_id: str
    campaign_id: str
    subscriber_id: str | None = None
    media_asset_id: str | None = None
    destination_url: str | None = None
    public_url: str
    click_count: int
    redeemed_count: int
    created_at: Any | None = None


class LandingPayloadResponse(BaseModel):
    token: str
    destination_url: str | None = None
    click_count: int
    campaign_name: str | None = None
    message_body: str | None = None
    media_asset: MediaAssetResponse | None = None


class RedemptionResponse(BaseModel):
    token: str
    status: str
    redeemed_count: int


class CampaignPerformanceResponse(BaseModel):
    media_asset_count: int
    tracked_link_count: int
    click_count: int
    redemption_count: int


class ReminderCampaignCreateRequest(BaseModel):
    source_campaign_id: str = Field(min_length=1)
    audience_rule: Literal["not_clicked", "clicked_not_redeemed"]
    message_body: str = Field(min_length=1)


class ReminderCampaignResponse(BaseModel):
    id: str
    company_id: str
    source_campaign_id: str
    audience_rule: str
    message_body: str
    status: str
    estimated_recipient_count: int
    created_at: Any | None = None


class AdminUsageResponse(BaseModel):
    company_id: str
    company_name: str
    campaign_count: int
    message_count: int
    media_asset_count: int
    tracked_link_count: int
    click_count: int
    redemption_count: int
    reminder_count: int


class CampaignRepository(Protocol):
    async def create_campaign_with_messages(
        self,
        *,
        company_id: str,
        name: str,
        body: str,
        recipients: list[str] | None,
        subscriber_ids: list[str],
        subscriber_list_ids: list[str],
        message_type: str,
        media_asset_id: str | None,
        actor_email: str | None,
        scheduled_at: str | None,
    ) -> dict[str, Any]: ...

    async def get_campaign_status(self, campaign_id: str) -> dict[str, Any] | None: ...

    async def create_company_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_email: str,
        monthly_send_limit: int | None,
        credit_balance: int,
    ) -> dict[str, Any]: ...

    async def list_user_memberships(self, *, email: str) -> list[dict[str, Any]]: ...

    async def create_company_access_code(
        self,
        *,
        company_id: str,
        role_slug: str,
        credit_limit: int | None,
    ) -> dict[str, Any] | None: ...

    async def signup_with_access_code(
        self,
        *,
        email: str,
        name: str,
        access_code: str,
    ) -> dict[str, Any] | None: ...

    async def get_company_dashboard_summary(
        self,
        *,
        company_id: str,
    ) -> dict[str, Any] | None: ...

    async def get_admin_dashboard_summary(self) -> dict[str, Any]: ...

    async def list_company_users(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def update_company_user(
        self,
        *,
        company_id: str,
        email: str,
        role_slug: str,
        credit_limit: int | None,
    ) -> dict[str, Any] | None: ...

    async def create_subscriber_list(self, *, company_id: str, name: str) -> dict[str, Any]: ...

    async def list_subscriber_lists(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def list_subscribers(self, *, company_id: str) -> list[dict[str, Any]]: ...

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

    async def create_media_asset(
        self,
        *,
        company_id: str,
        filename: str,
        content_type: str,
        url: str,
    ) -> dict[str, Any]: ...

    async def list_media_assets(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def create_campaign_link(
        self,
        *,
        company_id: str,
        campaign_id: str,
        subscriber_id: str | None,
        media_asset_id: str | None,
        destination_url: str | None,
    ) -> dict[str, Any]: ...

    async def list_campaign_links(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def register_click(
        self,
        *,
        token: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any] | None: ...

    async def redeem_link(self, *, token: str) -> dict[str, Any] | None: ...

    async def get_campaign_performance(self, *, company_id: str) -> dict[str, int]: ...

    async def create_reminder_campaign(
        self,
        *,
        company_id: str,
        source_campaign_id: str,
        audience_rule: str,
        message_body: str,
    ) -> dict[str, Any]: ...

    async def list_reminder_campaigns(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def list_campaigns(self, *, company_id: str) -> list[dict[str, Any]]: ...

    async def get_admin_usage(self, *, from_date: date, to_date: date) -> list[dict[str, Any]]: ...


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
        recipients: list[str] | None,
        subscriber_ids: list[str],
        subscriber_list_ids: list[str],
        message_type: str,
        actor_email: str | None,
        scheduled_at: str | None,
        media_asset_id: str | None,
    ) -> dict[str, Any]:
        campaign_id = str(uuid4())
        audience_rows: list[dict[str, str]]
        if recipients is None:
            audience_rows = await db.resolve_campaign_audience(
                self._pool,
                company_id=company_id,
                subscriber_ids=subscriber_ids,
                subscriber_list_ids=subscriber_list_ids,
            )
            resolved_recipients = [row["phone_number"] for row in audience_rows]
            resolved_subscriber_ids = [row["subscriber_id"] for row in audience_rows]
        else:
            resolved_recipients = recipients
            resolved_subscriber_ids = [None] * len(recipients)
        message_rows = build_message_rows(
            campaign_id,
            resolved_recipients,
            body,
            subscriber_ids=resolved_subscriber_ids,
        )
        credit_result = await db.create_campaign_with_messages(
            self._pool,
            company_id=company_id,
            campaign_id=campaign_id,
            name=name,
            body=body,
            messages=[row.model_dump() for row in message_rows],
            message_type=message_type,
            media_asset_id=media_asset_id,
            actor_email=actor_email,
            scheduled_at=scheduled_at,
        )
        if credit_result["status"] != "scheduled":
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
            "message_type": message_type,
            "status": credit_result["status"],
            "scheduled_at": scheduled_at,
            "audience_count": credit_result["audience_count"],
            "message_count": len(message_rows),
            "credit_cost": credit_result["credit_cost"],
            "remaining_credits": credit_result["remaining_credits"],
            "tracked_links": credit_result["tracked_links"],
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
        monthly_send_limit: int | None = None,
        credit_balance: int = 0,
    ) -> dict[str, Any]:
        return await db.create_company_with_admin(
            self._pool,
            name=name,
            slug=slug,
            admin_email=admin_email,
            monthly_send_limit=monthly_send_limit,
            credit_balance=credit_balance,
        )

    async def list_user_memberships(self, *, email: str) -> list[dict[str, Any]]:
        return await db.list_user_memberships(self._pool, email=email)

    async def create_company_access_code(
        self,
        *,
        company_id: str,
        role_slug: str = "customer_admin",
        credit_limit: int | None = None,
    ) -> dict[str, Any] | None:
        return await db.create_company_access_code(
            self._pool,
            company_id=company_id,
            role_slug=role_slug,
            credit_limit=credit_limit,
        )

    async def signup_with_access_code(
        self,
        *,
        email: str,
        name: str,
        access_code: str,
    ) -> dict[str, Any] | None:
        return await db.signup_with_access_code(
            self._pool,
            email=email,
            name=name,
            access_code=access_code,
        )

    async def get_company_dashboard_summary(self, *, company_id: str) -> dict[str, Any] | None:
        return await db.get_company_dashboard_summary(self._pool, company_id=company_id)

    async def get_admin_dashboard_summary(self) -> dict[str, Any]:
        return await db.get_admin_dashboard_summary(self._pool)

    async def list_company_users(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_company_users(self._pool, company_id=company_id)

    async def update_company_user(
        self,
        *,
        company_id: str,
        email: str,
        role_slug: str,
        credit_limit: int | None,
    ) -> dict[str, Any] | None:
        return await db.update_company_user(
            self._pool,
            company_id=company_id,
            email=email,
            role_slug=role_slug,
            credit_limit=credit_limit,
        )

    async def create_subscriber_list(self, *, company_id: str, name: str) -> dict[str, Any]:
        return await db.create_subscriber_list(self._pool, company_id=company_id, name=name)

    async def list_subscriber_lists(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_subscriber_lists(self._pool, company_id=company_id)

    async def list_subscribers(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_subscribers(self._pool, company_id=company_id)

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

    async def create_media_asset(
        self,
        *,
        company_id: str,
        filename: str,
        content_type: str,
        url: str,
    ) -> dict[str, Any]:
        return await db.create_media_asset(
            self._pool,
            company_id=company_id,
            filename=filename,
            content_type=content_type,
            url=url,
        )

    async def list_media_assets(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_media_assets(self._pool, company_id=company_id)

    async def create_campaign_link(
        self,
        *,
        company_id: str,
        campaign_id: str,
        subscriber_id: str | None,
        media_asset_id: str | None,
        destination_url: str | None,
    ) -> dict[str, Any]:
        return await db.create_campaign_link(
            self._pool,
            company_id=company_id,
            campaign_id=campaign_id,
            subscriber_id=subscriber_id,
            media_asset_id=media_asset_id,
            destination_url=destination_url,
        )

    async def list_campaign_links(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_campaign_links(self._pool, company_id=company_id)

    async def register_click(
        self,
        *,
        token: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, Any] | None:
        return await db.register_click(
            self._pool,
            token=token,
            ip_address=ip_address,
            user_agent=user_agent,
        )

    async def redeem_link(self, *, token: str) -> dict[str, Any] | None:
        return await db.redeem_link(self._pool, token=token)

    async def get_campaign_performance(self, *, company_id: str) -> dict[str, int]:
        return await db.get_campaign_performance(self._pool, company_id=company_id)

    async def create_reminder_campaign(
        self,
        *,
        company_id: str,
        source_campaign_id: str,
        audience_rule: str,
        message_body: str,
    ) -> dict[str, Any]:
        return await db.create_reminder_campaign(
            self._pool,
            company_id=company_id,
            source_campaign_id=source_campaign_id,
            audience_rule=audience_rule,
            message_body=message_body,
        )

    async def list_reminder_campaigns(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_reminder_campaigns(self._pool, company_id=company_id)

    async def list_campaigns(self, *, company_id: str) -> list[dict[str, Any]]:
        return await db.list_campaigns(self._pool, company_id=company_id)

    async def get_admin_usage(self, *, from_date: date, to_date: date) -> list[dict[str, Any]]:
        return await db.get_admin_usage(self._pool, from_date=from_date, to_date=to_date)


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
    user_email: str | None = Header(None, alias="X-User-Email"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    has_selected_audience = bool(request.subscriber_ids or request.subscriber_list_ids)
    recipients = request.recipients if request.recipients is not None else None
    if recipients is None and not has_selected_audience:
        recipients = default_recipients()
    if recipients is not None:
        ensure_unique_recipients(recipients)
    if request.message_type == "smart" and not request.media_asset_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="smart campaigns require a media_asset_id",
        )
    try:
        result = await repository.create_campaign_with_messages(
            company_id=company_id,
            name=request.name,
            body=request.body,
            message_type=request.message_type,
            media_asset_id=request.media_asset_id,
            actor_email=user_email,
            recipients=recipients,
            subscriber_ids=request.subscriber_ids,
            subscriber_list_ids=request.subscriber_list_ids,
            scheduled_at=request.scheduled_at,
        )
    except db.InsufficientCreditsError as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "message": exc.detail,
                "required_credits": exc.required_credits,
                "available_credits": exc.available_credits,
            },
        ) from exc
    except db.AudienceSelectionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "id": result["id"],
        "company_id": result["company_id"],
        "name": result["name"],
        "message_type": result["message_type"],
        "status": result.get("status", "queued"),
        "scheduled_at": result.get("scheduled_at"),
        "audience_count": result.get("audience_count", result["message_count"]),
        "message_count": result["message_count"],
        "credit_cost": result["credit_cost"],
        "remaining_credits": result["remaining_credits"],
        "tracked_links": result.get("tracked_links", []),
        "status_counts": result["status_counts"],
    }


@app.get(
    "/admin/dashboard-summary",
    response_model=AdminDashboardSummaryResponse,
)
async def get_admin_dashboard_summary(
    internal_admin: str | None = Header(None, alias="X-Internal-Admin"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    if internal_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="internal admin access required",
        )
    return await repository.get_admin_dashboard_summary()


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
        monthly_send_limit=request.monthly_send_limit,
        credit_balance=request.credit_balance,
    )


@app.post(
    "/admin/companies/{company_id}/access-codes",
    response_model=AccessCodeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_access_code(
    company_id: str,
    request: AccessCodeCreateRequest | None = None,
    internal_admin: str | None = Header(None, alias="X-Internal-Admin"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    if internal_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="internal admin access required",
        )
    access_code_request = request or AccessCodeCreateRequest()
    result = await repository.create_company_access_code(
        company_id=company_id,
        role_slug=access_code_request.role,
        credit_limit=access_code_request.credit_limit,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company not found")
    return result


@app.post(
    "/companies/{company_id}/access-codes",
    response_model=AccessCodeCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_company_user_access_code(
    company_id: str,
    request: AccessCodeCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.create_company_access_code(
        company_id=company_id,
        role_slug=request.role,
        credit_limit=request.credit_limit,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company not found")
    return result


@app.post(
    "/signup/access-code",
    response_model=AccessCodeSignupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def signup_with_access_code(
    request: AccessCodeSignupRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.signup_with_access_code(
        email=request.email,
        name=request.name,
        access_code=request.access_code,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="access code not found")
    return result


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


@app.get(
    "/companies/{company_id}/dashboard-summary",
    response_model=CompanyDashboardSummaryResponse,
)
async def get_company_dashboard_summary(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.get_company_dashboard_summary(company_id=company_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company not found")
    return result


@app.get("/companies/{company_id}/users", response_model=list[CompanyUserResponse])
async def list_company_users(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_company_users(company_id=company_id)


@app.patch("/companies/{company_id}/users/{email}", response_model=CompanyUserResponse)
async def update_company_user(
    company_id: str,
    email: str,
    request: CompanyUserUpdateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.update_company_user(
        company_id=company_id,
        email=email,
        role_slug=request.role,
        credit_limit=request.credit_limit,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company user not found")
    return result


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


@app.get("/companies/{company_id}/subscriber-lists", response_model=list[SubscriberListResponse])
async def list_subscriber_lists(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_subscriber_lists(company_id=company_id)


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


@app.get("/companies/{company_id}/subscribers", response_model=list[SubscriberResponse])
async def list_subscribers(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_subscribers(company_id=company_id)


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


@app.post(
    "/companies/{company_id}/media-assets",
    response_model=MediaAssetResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_media_asset(
    company_id: str,
    request: MediaAssetCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    return await repository.create_media_asset(
        company_id=company_id,
        filename=request.filename,
        content_type=request.content_type,
        url=request.url,
    )


@app.get("/companies/{company_id}/media-assets", response_model=list[MediaAssetResponse])
async def list_media_assets(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_media_assets(company_id=company_id)


@app.post(
    "/companies/{company_id}/campaign-links",
    response_model=CampaignLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign_link(
    company_id: str,
    request: CampaignLinkCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    return await repository.create_campaign_link(
        company_id=company_id,
        campaign_id=request.campaign_id,
        subscriber_id=request.subscriber_id,
        media_asset_id=request.media_asset_id,
        destination_url=request.destination_url,
    )


@app.get("/companies/{company_id}/campaign-links", response_model=list[CampaignLinkResponse])
async def list_campaign_links(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_campaign_links(company_id=company_id)


@app.get("/r/{token}", response_model=LandingPayloadResponse)
async def open_campaign_link(
    token: str,
    http_request: Request,
    user_agent: str | None = Header(None, alias="User-Agent"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    client_host = http_request.client.host if http_request.client else None
    result = await repository.register_click(
        token=token,
        ip_address=client_host,
        user_agent=user_agent,
    )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campaign link not found")
    return result


@app.post("/r/{token}/redeem", response_model=RedemptionResponse)
async def redeem_campaign_link(
    token: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    result = await repository.redeem_link(token=token)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="campaign link not found")
    return result


@app.get("/companies/{company_id}/campaign-performance", response_model=CampaignPerformanceResponse)
async def get_campaign_performance(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, int]:
    return await repository.get_campaign_performance(company_id=company_id)


@app.post(
    "/companies/{company_id}/reminder-campaigns",
    response_model=ReminderCampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reminder_campaign(
    company_id: str,
    request: ReminderCampaignCreateRequest,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> dict[str, Any]:
    try:
        return await repository.create_reminder_campaign(
            company_id=company_id,
            source_campaign_id=request.source_campaign_id,
            audience_rule=request.audience_rule,
            message_body=request.message_body,
        )
    except db.ReminderEligibilityError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@app.get(
    "/companies/{company_id}/reminder-campaigns",
    response_model=list[ReminderCampaignResponse],
)
async def list_reminder_campaigns(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_reminder_campaigns(company_id=company_id)


@app.get("/companies/{company_id}/campaigns", response_model=list[CampaignListItemResponse])
async def list_campaigns(
    company_id: str,
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    return await repository.list_campaigns(company_id=company_id)


@app.get("/admin/usage", response_model=list[AdminUsageResponse])
async def get_admin_usage(
    from_date: Annotated[date, Query(alias="from")],
    to_date: Annotated[date, Query(alias="to")],
    internal_admin: str | None = Header(None, alias="X-Internal-Admin"),
    repository: CampaignRepository = REPOSITORY_DEPENDENCY,
) -> list[dict[str, Any]]:
    if internal_admin != "true":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="internal admin access required",
        )
    return await repository.get_admin_usage(from_date=from_date, to_date=to_date)


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


def build_message_rows(
    campaign_id: str,
    recipients: Sequence[str],
    body: str,
    *,
    subscriber_ids: Sequence[str | None] | None = None,
) -> list[MessageRow]:
    rows: list[MessageRow] = []
    subscriber_values = subscriber_ids if subscriber_ids is not None else [None] * len(recipients)
    for recipient, subscriber_id in zip(recipients, subscriber_values, strict=True):
        idempotency_key = generate_idempotency_key(campaign_id, recipient, body)
        message_id = generate_idempotency_key("message", idempotency_key)[:32]
        rows.append(
            MessageRow(
                message_id=message_id,
                campaign_id=campaign_id,
                recipient=recipient,
                subscriber_id=subscriber_id,
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
