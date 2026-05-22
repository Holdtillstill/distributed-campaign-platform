from __future__ import annotations

import os
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import asyncpg

DEFAULT_DATABASE_URL = "postgresql://campaign:campaign@localhost:5432/campaign_local"
SCHEMA_PATH = Path(__file__).with_name("schema.sql")
MESSAGE_CREDIT_COSTS = {"regular": 1, "smart": 2}


class InsufficientCreditsError(Exception):
    def __init__(self, detail: str, *, required_credits: int, available_credits: int) -> None:
        super().__init__(detail)
        self.detail = detail
        self.required_credits = required_credits
        self.available_credits = available_credits


class AudienceSelectionError(Exception):
    pass


class ReminderEligibilityError(Exception):
    pass


def database_url_from_env() -> str:
    return os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)


def load_schema() -> str:
    return SCHEMA_PATH.read_text(encoding="utf-8")


async def init_db(pool: asyncpg.Pool) -> None:
    async with pool.acquire() as connection:
        await connection.execute(load_schema())


async def create_campaign_with_messages(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    campaign_id: str,
    name: str,
    body: str,
    message_type: str,
    actor_email: str | None,
    messages: list[dict[str, Any]],
    media_asset_id: str | None = None,
    scheduled_at: str | None = None,
) -> dict[str, Any]:
    unit_cost = MESSAGE_CREDIT_COSTS[message_type]
    credit_cost = unit_cost * len(messages)
    campaign_status = "scheduled" if scheduled_at else "queued"
    scheduled_at_value = _parse_timestamp(scheduled_at)
    async with pool.acquire() as connection, connection.transaction():
        company = await connection.fetchrow(
            """
            SELECT credit_balance
            FROM companies
            WHERE id = $1
            FOR UPDATE
            """,
            company_id,
        )
        if company is None:
            raise InsufficientCreditsError(
                "company not found",
                required_credits=credit_cost,
                available_credits=0,
            )
        if company["credit_balance"] < credit_cost:
            raise InsufficientCreditsError(
                "company credits exhausted",
                required_credits=credit_cost,
                available_credits=company["credit_balance"],
            )
        if actor_email:
            membership = await connection.fetchrow(
                """
                SELECT cm.credit_limit, cm.credits_used
                FROM company_memberships cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.company_id = $1 AND u.email = $2
                FOR UPDATE OF cm
                """,
                company_id,
                actor_email,
            )
            if membership and membership["credit_limit"] is not None:
                available_user_credits = membership["credit_limit"] - membership["credits_used"]
                if available_user_credits < credit_cost:
                    raise InsufficientCreditsError(
                        "user budget exhausted",
                        required_credits=credit_cost,
                        available_credits=available_user_credits,
                    )
                await connection.execute(
                    """
                    UPDATE company_memberships
                    SET credits_used = credits_used + $1
                    WHERE company_id = $2
                      AND user_id = (SELECT id FROM users WHERE email = $3)
                    """,
                    credit_cost,
                    company_id,
                    actor_email,
                )
        remaining_credits = await connection.fetchval(
            """
            UPDATE companies
            SET credit_balance = credit_balance - $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING credit_balance
            """,
            credit_cost,
            company_id,
        )
        await connection.execute(
            """
                INSERT INTO campaigns (
                    id,
                    company_id,
                    name,
                    body,
                    message_type,
                    status,
                    scheduled_at,
                    credit_cost
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8)
                """,
            campaign_id,
            company_id,
            name,
            body,
            message_type,
            campaign_status,
            scheduled_at_value,
            credit_cost,
        )
        await connection.executemany(
            """
                INSERT INTO messages (
                    id,
                    company_id,
                    campaign_id,
                    recipient,
                    subscriber_id,
                    body,
                    status,
                    idempotency_key
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
            [
                (
                    message["message_id"],
                    company_id,
                    message["campaign_id"],
                    message["recipient"],
                    message.get("subscriber_id"),
                    message["body"],
                    message["status"],
                    message["idempotency_key"],
                )
                for message in messages
            ],
        )
        tracked_links = []
        if message_type == "smart" and media_asset_id:
            for message in messages:
                if not message.get("subscriber_id"):
                    continue
                link_id = str(uuid4())
                token = uuid4().hex
                link = await connection.fetchrow(
                    """
                    INSERT INTO campaign_links (
                        id,
                        token,
                        company_id,
                        campaign_id,
                        subscriber_id,
                        media_asset_id,
                        destination_url
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, NULL)
                    RETURNING
                        id,
                        token,
                        company_id,
                        campaign_id,
                        subscriber_id,
                        media_asset_id,
                        destination_url,
                        click_count,
                        redeemed_count,
                        created_at
                    """,
                    link_id,
                    token,
                    company_id,
                    campaign_id,
                    message["subscriber_id"],
                    media_asset_id,
                )
                tracked_links.append(_link_with_public_url(dict(link)))
    return {
        "credit_cost": credit_cost,
        "remaining_credits": remaining_credits,
        "status": campaign_status,
        "audience_count": len(messages),
        "tracked_links": tracked_links,
    }


async def resolve_campaign_audience(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    subscriber_ids: list[str],
    subscriber_list_ids: list[str],
) -> list[dict[str, str]]:
    if not subscriber_ids and not subscriber_list_ids:
        raise AudienceSelectionError("choose at least one subscriber or list")
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            WITH selected_subscribers AS (
                SELECT s.id, s.phone_number
                FROM subscribers s
                WHERE s.company_id = $1
                  AND s.id = ANY($2::text[])
                UNION
                SELECT s.id, s.phone_number
                FROM subscriber_list_memberships slm
                JOIN subscribers s ON s.id = slm.subscriber_id
                WHERE s.company_id = $1
                  AND slm.subscriber_list_id = ANY($3::text[])
            )
            SELECT DISTINCT ON (id)
                id AS subscriber_id,
                phone_number
            FROM selected_subscribers
            ORDER BY id
            """,
            company_id,
            subscriber_ids,
            subscriber_list_ids,
        )
    if not rows:
        raise AudienceSelectionError("selected audience has no eligible subscribers")
    return [dict(row) for row in rows]


async def get_campaign_status(pool: asyncpg.Pool, campaign_id: str) -> dict[str, Any] | None:
    async with pool.acquire() as connection:
        campaign = await connection.fetchrow(
            """
            SELECT id, company_id, name
            FROM campaigns
            WHERE id = $1
            """,
            campaign_id,
        )
        if campaign is None:
            return None

        rows = await connection.fetch(
            """
            SELECT status, COUNT(*)::int AS count
            FROM messages
            WHERE campaign_id = $1
            GROUP BY status
            """,
            campaign_id,
        )

    counts = {
        "queued": 0,
        "sent": 0,
        "failed": 0,
        "retried": 0,
        "dead_lettered": 0,
    }
    for row in rows:
        status = row["status"]
        if status in counts:
            counts[status] = row["count"]

    return {
        "id": campaign["id"],
        "company_id": campaign["company_id"],
        "name": campaign["name"],
        "status_counts": counts,
    }


async def create_company_with_admin(
    pool: asyncpg.Pool,
    *,
    name: str,
    slug: str,
    admin_email: str,
    monthly_send_limit: int | None = None,
    credit_balance: int = 0,
) -> dict[str, Any]:
    company_id = str(uuid4())
    user_id = str(uuid4())
    audit_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        company = await connection.fetchrow(
            """
            INSERT INTO companies (id, name, slug, monthly_send_limit, credit_balance)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, slug, monthly_send_limit, credit_balance
            """,
            company_id,
            name,
            slug,
            monthly_send_limit,
            credit_balance,
        )
        user = await connection.fetchrow(
            """
            INSERT INTO users (id, email)
            VALUES ($1, $2)
            ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
            RETURNING id, email
            """,
            user_id,
            admin_email,
        )
        await connection.execute(
            """
            INSERT INTO company_memberships (company_id, user_id, role_slug)
            VALUES ($1, $2, 'customer_admin')
            ON CONFLICT (company_id, user_id) DO UPDATE SET role_slug = EXCLUDED.role_slug
            """,
            company["id"],
            user["id"],
        )
        await connection.execute(
            """
            INSERT INTO audit_events (id, company_id, actor_user_id, event_type, details)
            VALUES ($1, $2, $3, 'company.created', jsonb_build_object('admin_email', $4::text))
            """,
            audit_id,
            company["id"],
            user["id"],
            admin_email,
        )
        access_code = await _create_company_access_code(
            connection,
            company_id=company["id"],
            company_slug=company["slug"],
            role_slug="customer_admin",
            credit_limit=None,
        )

    return {
        "id": company["id"],
        "name": company["name"],
        "slug": company["slug"],
        "monthly_send_limit": company["monthly_send_limit"],
        "credit_balance": company["credit_balance"],
        "access_code": access_code["code"],
        "admin_user": {
            "id": user["id"],
            "email": user["email"],
            "role": "customer_admin",
        },
    }


async def list_user_memberships(pool: asyncpg.Pool, *, email: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                c.id AS company_id,
                c.name AS company_name,
                c.slug AS company_slug,
                cm.role_slug AS role,
                cm.credit_limit,
                cm.credits_used
            FROM users u
            JOIN company_memberships cm ON cm.user_id = u.id
            JOIN companies c ON c.id = cm.company_id
            WHERE u.email = $1
            ORDER BY c.name
            """,
            email,
        )
    return [dict(row) for row in rows]


async def create_company_access_code(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    role_slug: str = "customer_admin",
    credit_limit: int | None = None,
) -> dict[str, Any] | None:
    async with pool.acquire() as connection:
        company = await connection.fetchrow(
            """
            SELECT id, slug
            FROM companies
            WHERE id = $1
            """,
            company_id,
        )
        if company is None:
            return None
        return await _create_company_access_code(
            connection,
            company_id=company["id"],
            company_slug=company["slug"],
            role_slug=role_slug,
            credit_limit=credit_limit,
        )


async def signup_with_access_code(
    pool: asyncpg.Pool,
    *,
    email: str,
    name: str,
    access_code: str,
) -> dict[str, Any] | None:
    user_id = str(uuid4())
    normalized_code = access_code.strip().upper()
    async with pool.acquire() as connection, connection.transaction():
        code_row = await connection.fetchrow(
            """
            SELECT
                ac.code,
                ac.company_id,
                ac.role_slug,
                ac.credit_limit,
                c.name AS company_name
            FROM company_access_codes ac
            JOIN companies c ON c.id = ac.company_id
            WHERE ac.code = $1
              AND ac.revoked_at IS NULL
              AND c.status = 'active'
            """,
            normalized_code,
        )
        if code_row is None:
            return None
        user = await connection.fetchrow(
            """
            INSERT INTO users (id, email, display_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (email) DO UPDATE SET
                display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                updated_at = NOW()
            RETURNING id, email
            """,
            user_id,
            email,
            name,
        )
        await connection.execute(
            """
            INSERT INTO company_memberships (company_id, user_id, role_slug, credit_limit)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (company_id, user_id) DO UPDATE SET
                role_slug = EXCLUDED.role_slug,
                credit_limit = COALESCE(EXCLUDED.credit_limit, company_memberships.credit_limit)
            """,
            code_row["company_id"],
            user["id"],
            code_row["role_slug"],
            code_row["credit_limit"],
        )
    return {
        "role": "company_user",
        "email": user["email"],
        "company_id": code_row["company_id"],
        "company_name": code_row["company_name"],
        "membership_role": code_row["role_slug"],
        "credit_limit": code_row["credit_limit"],
    }


async def get_company_dashboard_summary(
    pool: asyncpg.Pool,
    *,
    company_id: str,
) -> dict[str, Any] | None:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT
                c.id AS company_id,
                c.name AS company_name,
                c.monthly_send_limit,
                c.credit_balance,
                (SELECT COUNT(*)::int FROM subscribers WHERE company_id = c.id) AS subscriber_count,
                (SELECT COUNT(*)::int FROM campaigns WHERE company_id = c.id) AS campaign_count,
                (SELECT COUNT(*)::int FROM messages WHERE company_id = c.id) AS message_count,
                COALESCE(
                    (SELECT SUM(credit_cost)::int FROM campaigns WHERE company_id = c.id),
                    0
                ) AS credits_used,
                COALESCE(
                    (SELECT SUM(click_count)::int FROM campaign_links WHERE company_id = c.id),
                    0
                ) AS click_count,
                COALESCE(
                    (SELECT SUM(redeemed_count)::int FROM campaign_links WHERE company_id = c.id),
                    0
                ) AS redemption_count
            FROM companies c
            WHERE c.id = $1
            """,
            company_id,
        )
    return dict(row) if row is not None else None


async def get_admin_dashboard_summary(pool: asyncpg.Pool) -> dict[str, int]:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT
                (SELECT COUNT(*)::int FROM companies) AS company_count,
                (
                    SELECT COUNT(*)::int
                    FROM companies
                    WHERE status = 'active'
                ) AS active_company_count,
                COALESCE(
                    (SELECT SUM(credit_balance)::int FROM companies),
                    0
                ) AS total_credit_balance,
                (
                    SELECT COUNT(*)::int
                    FROM company_access_codes
                    WHERE revoked_at IS NULL
                ) AS active_access_code_count
            """
        )
    return dict(row)


async def list_company_users(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                u.id AS user_id,
                u.email,
                u.display_name,
                cm.role_slug AS role,
                cm.credit_limit,
                cm.credits_used
            FROM company_memberships cm
            JOIN users u ON u.id = cm.user_id
            WHERE cm.company_id = $1
            ORDER BY u.email
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def update_company_user(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    email: str,
    role_slug: str,
    credit_limit: int | None,
) -> dict[str, Any] | None:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            UPDATE company_memberships cm
            SET role_slug = $3,
                credit_limit = $4
            FROM users u
            WHERE cm.user_id = u.id
              AND cm.company_id = $1
              AND u.email = $2
            RETURNING
                u.id AS user_id,
                u.email,
                u.display_name,
                cm.role_slug AS role,
                cm.credit_limit,
                cm.credits_used
            """,
            company_id,
            email,
            role_slug,
            credit_limit,
        )
    return dict(row) if row is not None else None


async def create_subscriber_list(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    name: str,
) -> dict[str, Any]:
    list_id = str(uuid4())
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            INSERT INTO subscriber_lists (id, company_id, name)
            VALUES ($1, $2, $3)
            RETURNING id, company_id, name
            """,
            list_id,
            company_id,
            name,
        )
    return {**dict(row), "subscriber_count": 0}


async def list_subscriber_lists(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                sl.id,
                sl.company_id,
                sl.name,
                COUNT(slm.subscriber_id)::int AS subscriber_count
            FROM subscriber_lists sl
            LEFT JOIN subscriber_list_memberships slm ON slm.subscriber_list_id = sl.id
            WHERE sl.company_id = $1
            GROUP BY sl.id, sl.company_id, sl.name
            ORDER BY sl.name
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def list_subscribers(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                s.id,
                s.company_id,
                s.phone_number,
                s.marketing_status,
                s.consent_status,
                s.source,
                s.created_at,
                (
                    SELECT slm.subscriber_list_id
                    FROM subscriber_list_memberships slm
                    WHERE slm.subscriber_id = s.id
                    ORDER BY slm.created_at DESC
                    LIMIT 1
                ) AS list_id
            FROM subscribers s
            WHERE s.company_id = $1
              AND s.marketing_status <> 'opted_out'
              AND s.consent_status IN ('company_provided', 'double_opt_in_confirmed')
            ORDER BY s.created_at DESC
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def import_subscriber(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    phone_number: str,
    source: str,
    list_id: str | None,
) -> dict[str, Any]:
    subscriber_id = str(uuid4())
    consent_event_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        subscriber = await connection.fetchrow(
            """
            INSERT INTO subscribers (
                id, company_id, phone_number, marketing_status, consent_status, source
            )
            VALUES ($1, $2, $3, 'imported', 'company_provided', $4)
            ON CONFLICT (company_id, phone_number) DO UPDATE SET
                marketing_status = 'imported',
                consent_status = 'company_provided',
                source = EXCLUDED.source,
                updated_at = NOW()
            RETURNING id, company_id, phone_number, marketing_status, consent_status
            """,
            subscriber_id,
            company_id,
            phone_number,
            source,
        )
        if list_id:
            await connection.execute(
                """
                INSERT INTO subscriber_list_memberships (subscriber_list_id, subscriber_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                """,
                list_id,
                subscriber["id"],
            )
        await connection.execute(
            """
            INSERT INTO consent_events (id, company_id, subscriber_id, event_type, source)
            VALUES ($1, $2, $3, 'company_provided', $4)
            """,
            consent_event_id,
            company_id,
            subscriber["id"],
            source,
        )
    return {**dict(subscriber), "list_id": list_id, "source": source}


async def start_double_opt_in(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    phone_number: str,
    source: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any]:
    subscriber_id = str(uuid4())
    token = str(uuid4())
    event_id = str(uuid4())
    expires_at = datetime.now(UTC) + timedelta(hours=24)
    async with pool.acquire() as connection, connection.transaction():
        subscriber = await connection.fetchrow(
            """
            INSERT INTO subscribers (
                id, company_id, phone_number, marketing_status, consent_status, source
            )
            VALUES ($1, $2, $3, 'pending_confirmation', 'double_opt_in_requested', $4)
            ON CONFLICT (company_id, phone_number) DO UPDATE SET
                marketing_status = 'pending_confirmation',
                consent_status = 'double_opt_in_requested',
                source = EXCLUDED.source,
                updated_at = NOW()
            RETURNING id, company_id, phone_number
            """,
            subscriber_id,
            company_id,
            phone_number,
            source,
        )
        await connection.execute(
            """
            INSERT INTO double_opt_in_tokens (token, company_id, subscriber_id, expires_at)
            VALUES ($1, $2, $3, $4)
            """,
            token,
            company_id,
            subscriber["id"],
            expires_at,
        )
        await connection.execute(
            """
            INSERT INTO consent_events (
                id, company_id, subscriber_id, event_type, source, ip_address, user_agent
            )
            VALUES ($1, $2, $3, 'double_opt_in_requested', $4, $5, $6)
            """,
            event_id,
            company_id,
            subscriber["id"],
            source,
            ip_address,
            user_agent,
        )
    return {
        "subscriber_id": subscriber["id"],
        "company_id": subscriber["company_id"],
        "phone_number": subscriber["phone_number"],
        "status": "pending_confirmation",
        "confirmation_token": token,
    }


async def confirm_double_opt_in(pool: asyncpg.Pool, *, token: str) -> dict[str, Any] | None:
    event_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        token_row = await connection.fetchrow(
            """
            SELECT token, company_id, subscriber_id
            FROM double_opt_in_tokens
            WHERE token = $1 AND confirmed_at IS NULL AND expires_at > NOW()
            """,
            token,
        )
        if token_row is None:
            return None
        subscriber = await connection.fetchrow(
            """
            UPDATE subscribers
            SET marketing_status = 'confirmed',
                consent_status = 'double_opt_in_confirmed',
                confirmed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, company_id, phone_number
            """,
            token_row["subscriber_id"],
        )
        await connection.execute(
            """
            UPDATE double_opt_in_tokens SET confirmed_at = NOW() WHERE token = $1
            """,
            token,
        )
        await connection.execute(
            """
            INSERT INTO consent_events (id, company_id, subscriber_id, event_type, source)
            VALUES ($1, $2, $3, 'double_opt_in_confirmed', 'confirmation_link')
            """,
            event_id,
            token_row["company_id"],
            token_row["subscriber_id"],
        )
    return {
        "subscriber_id": subscriber["id"],
        "company_id": subscriber["company_id"],
        "phone_number": subscriber["phone_number"],
        "status": "confirmed",
    }


async def create_media_asset(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    filename: str,
    content_type: str,
    url: str,
) -> dict[str, Any]:
    asset_id = str(uuid4())
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            INSERT INTO media_assets (id, company_id, filename, content_type, url)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, company_id, filename, content_type, url, created_at
            """,
            asset_id,
            company_id,
            filename,
            content_type,
            url,
        )
    return dict(row)


async def list_media_assets(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT id, company_id, filename, content_type, url, created_at
            FROM media_assets
            WHERE company_id = $1
            ORDER BY created_at DESC
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def create_campaign_link(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    campaign_id: str,
    subscriber_id: str | None,
    media_asset_id: str | None,
    destination_url: str | None,
) -> dict[str, Any]:
    link_id = str(uuid4())
    token = uuid4().hex
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            INSERT INTO campaign_links (
                id,
                token,
                company_id,
                campaign_id,
                subscriber_id,
                media_asset_id,
                destination_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                token,
                company_id,
                campaign_id,
                subscriber_id,
                media_asset_id,
                destination_url,
                click_count,
                redeemed_count,
                created_at
            """,
            link_id,
            token,
            company_id,
            campaign_id,
            subscriber_id,
            media_asset_id,
            destination_url,
        )
    return _link_with_public_url(dict(row))


async def list_campaign_links(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                id,
                token,
                company_id,
                campaign_id,
                subscriber_id,
                media_asset_id,
                destination_url,
                click_count,
                redeemed_count,
                created_at
            FROM campaign_links
            WHERE company_id = $1
            ORDER BY created_at DESC
            """,
            company_id,
        )
    return [_link_with_public_url(dict(row)) for row in rows]


async def register_click(
    pool: asyncpg.Pool,
    *,
    token: str,
    ip_address: str | None,
    user_agent: str | None,
) -> dict[str, Any] | None:
    event_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        link = await connection.fetchrow(
            """
            UPDATE campaign_links
            SET click_count = click_count + 1
            WHERE token = $1
            RETURNING
                id,
                token,
                campaign_id,
                destination_url,
                click_count,
                media_asset_id
            """,
            token,
        )
        if link is None:
            return None
        campaign = await connection.fetchrow(
            """
            SELECT name, body
            FROM campaigns
            WHERE id = $1
            """,
            link["campaign_id"],
        )
        await connection.execute(
            """
            INSERT INTO click_events (id, campaign_link_id, ip_address, user_agent)
            VALUES ($1, $2, $3, $4)
            """,
            event_id,
            link["id"],
            ip_address,
            user_agent,
        )
        media_asset = None
        if link["media_asset_id"]:
            media_asset_row = await connection.fetchrow(
                """
                SELECT id, company_id, filename, content_type, url, created_at
                FROM media_assets
                WHERE id = $1
                """,
                link["media_asset_id"],
            )
            if media_asset_row is not None:
                media_asset = dict(media_asset_row)
    return {
        "token": link["token"],
        "destination_url": link["destination_url"],
        "click_count": link["click_count"],
        "campaign_name": campaign["name"] if campaign else None,
        "message_body": campaign["body"] if campaign else None,
        "media_asset": media_asset,
    }


async def redeem_link(pool: asyncpg.Pool, *, token: str) -> dict[str, Any] | None:
    event_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        link = await connection.fetchrow(
            """
            UPDATE campaign_links
            SET redeemed_count = redeemed_count + 1
            WHERE token = $1
            RETURNING id, token, redeemed_count
            """,
            token,
        )
        if link is None:
            return None
        await connection.execute(
            """
            INSERT INTO redemption_events (id, campaign_link_id)
            VALUES ($1, $2)
            """,
            event_id,
            link["id"],
        )
    return {"token": link["token"], "status": "redeemed", "redeemed_count": link["redeemed_count"]}


async def get_campaign_performance(pool: asyncpg.Pool, *, company_id: str) -> dict[str, int]:
    async with pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT
                (SELECT COUNT(*)::int FROM media_assets WHERE company_id = $1) AS media_asset_count,
                (
                    SELECT COUNT(*)::int FROM campaign_links WHERE company_id = $1
                ) AS tracked_link_count,
                COALESCE(
                    (SELECT SUM(click_count)::int FROM campaign_links WHERE company_id = $1),
                    0
                ) AS click_count,
                COALESCE(
                    (SELECT SUM(redeemed_count)::int FROM campaign_links WHERE company_id = $1),
                    0
                ) AS redemption_count
            """,
            company_id,
        )
    return dict(row)


async def create_reminder_campaign(
    pool: asyncpg.Pool,
    *,
    company_id: str,
    source_campaign_id: str,
    audience_rule: str,
    message_body: str,
) -> dict[str, Any]:
    reminder_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        source_campaign = await connection.fetchrow(
            """
            SELECT id
            FROM campaigns
            WHERE id = $1
              AND company_id = $2
              AND COALESCE(scheduled_at, created_at) >= NOW() - INTERVAL '7 days'
            """,
            source_campaign_id,
            company_id,
        )
        if source_campaign is None:
            raise ReminderEligibilityError(
                "reminders can only target campaigns from the last 7 days"
            )
        estimated_recipient_count = await _estimate_reminder_recipients(
            connection,
            company_id=company_id,
            source_campaign_id=source_campaign_id,
            audience_rule=audience_rule,
        )
        row = await connection.fetchrow(
            """
            INSERT INTO reminder_campaigns (
                id,
                company_id,
                source_campaign_id,
                audience_rule,
                message_body,
                estimated_recipient_count
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                company_id,
                source_campaign_id,
                audience_rule,
                message_body,
                status,
                estimated_recipient_count,
                created_at
            """,
            reminder_id,
            company_id,
            source_campaign_id,
            audience_rule,
            message_body,
            estimated_recipient_count,
        )
    return dict(row)


async def list_reminder_campaigns(
    pool: asyncpg.Pool,
    *,
    company_id: str,
) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                id,
                company_id,
                source_campaign_id,
                audience_rule,
                message_body,
                status,
                estimated_recipient_count,
                created_at
            FROM reminder_campaigns
            WHERE company_id = $1
            ORDER BY created_at DESC
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def list_campaigns(pool: asyncpg.Pool, *, company_id: str) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                c.id,
                c.company_id,
                c.name,
                c.message_type,
                c.status,
                c.scheduled_at,
                c.created_at,
                COUNT(DISTINCT m.id)::int AS message_count,
                c.credit_cost,
                COUNT(DISTINCT rc.id)::int AS reminder_count
            FROM campaigns c
            LEFT JOIN messages m ON m.campaign_id = c.id
            LEFT JOIN reminder_campaigns rc ON rc.source_campaign_id = c.id
            WHERE c.company_id = $1
            GROUP BY
                c.id,
                c.company_id,
                c.name,
                c.message_type,
                c.status,
                c.scheduled_at,
                c.created_at,
                c.credit_cost
            ORDER BY COALESCE(c.scheduled_at, c.created_at) DESC
            """,
            company_id,
        )
    return [dict(row) for row in rows]


async def get_admin_usage(
    pool: asyncpg.Pool,
    *,
    from_date: str,
    to_date: str,
) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            WITH bounds AS (
                SELECT $1::date AS start_date, ($2::date + INTERVAL '1 day') AS end_date
            )
            SELECT
                c.id AS company_id,
                c.name AS company_name,
                (
                    SELECT COUNT(*)::int
                    FROM campaigns campaigns_for_company, bounds
                    WHERE campaigns_for_company.company_id = c.id
                      AND campaigns_for_company.created_at >= bounds.start_date
                      AND campaigns_for_company.created_at < bounds.end_date
                ) AS campaign_count,
                (
                    SELECT COUNT(*)::int
                    FROM messages messages_for_company, bounds
                    WHERE messages_for_company.company_id = c.id
                      AND messages_for_company.created_at >= bounds.start_date
                      AND messages_for_company.created_at < bounds.end_date
                ) AS message_count,
                (
                    SELECT COUNT(*)::int
                    FROM media_assets assets_for_company, bounds
                    WHERE assets_for_company.company_id = c.id
                      AND assets_for_company.created_at >= bounds.start_date
                      AND assets_for_company.created_at < bounds.end_date
                ) AS media_asset_count,
                (
                    SELECT COUNT(*)::int
                    FROM campaign_links links_for_company, bounds
                    WHERE links_for_company.company_id = c.id
                      AND links_for_company.created_at >= bounds.start_date
                      AND links_for_company.created_at < bounds.end_date
                ) AS tracked_link_count,
                (
                    SELECT COUNT(*)::int
                    FROM click_events click_events_for_company
                    JOIN campaign_links clicked_links
                      ON clicked_links.id = click_events_for_company.campaign_link_id,
                    bounds
                    WHERE clicked_links.company_id = c.id
                      AND click_events_for_company.created_at >= bounds.start_date
                      AND click_events_for_company.created_at < bounds.end_date
                ) AS click_count,
                (
                    SELECT COUNT(*)::int
                    FROM redemption_events redemption_events_for_company
                    JOIN campaign_links redeemed_links
                      ON redeemed_links.id = redemption_events_for_company.campaign_link_id,
                    bounds
                    WHERE redeemed_links.company_id = c.id
                      AND redemption_events_for_company.created_at >= bounds.start_date
                      AND redemption_events_for_company.created_at < bounds.end_date
                ) AS redemption_count,
                (
                    SELECT COUNT(*)::int
                    FROM reminder_campaigns reminders_for_company, bounds
                    WHERE reminders_for_company.company_id = c.id
                      AND reminders_for_company.created_at >= bounds.start_date
                      AND reminders_for_company.created_at < bounds.end_date
                ) AS reminder_count
            FROM companies c
            ORDER BY c.name
            """,
            from_date,
            to_date,
        )
    return [dict(row) for row in rows]


async def get_admin_company_health(
    pool: asyncpg.Pool,
    *,
    from_date: str,
    to_date: str,
) -> list[dict[str, Any]]:
    async with pool.acquire() as connection:
        rows = await connection.fetch(
            """
            WITH bounds AS (
                SELECT $1::date AS start_date, ($2::date + INTERVAL '1 day') AS end_date
            ),
            company_rollups AS (
                SELECT
                    c.id AS company_id,
                    c.name AS company_name,
                    c.credit_balance AS credits_remaining,
                    c.monthly_send_limit,
                    (
                        SELECT COUNT(*)::int
                        FROM subscribers subscribers_for_company
                        WHERE subscribers_for_company.company_id = c.id
                          AND subscribers_for_company.marketing_status <> 'opted_out'
                    ) AS subscriber_count,
                    (
                        SELECT COUNT(*)::int
                        FROM campaigns campaigns_for_company
                        WHERE campaigns_for_company.company_id = c.id
                    ) AS campaign_count,
                    COALESCE(
                        (
                            SELECT COUNT(messages_for_campaign.id)::int
                            FROM campaigns scheduled_campaigns
                            LEFT JOIN messages messages_for_campaign
                              ON messages_for_campaign.campaign_id = scheduled_campaigns.id,
                            bounds
                            WHERE scheduled_campaigns.company_id = c.id
                              AND scheduled_campaigns.status = 'scheduled'
                              AND scheduled_campaigns.scheduled_at >= bounds.start_date
                              AND scheduled_campaigns.scheduled_at < bounds.end_date
                        ),
                        0
                    ) AS scheduled_reach,
                    (
                        SELECT code
                        FROM company_access_codes access_codes_for_company
                        WHERE access_codes_for_company.company_id = c.id
                          AND access_codes_for_company.revoked_at IS NULL
                        ORDER BY access_codes_for_company.created_at DESC
                        LIMIT 1
                    ) AS active_access_code
                FROM companies c
            )
            SELECT
                company_id,
                company_name,
                subscriber_count,
                campaign_count,
                scheduled_reach,
                credits_remaining,
                monthly_send_limit,
                CASE
                    WHEN monthly_send_limit IS NULL OR monthly_send_limit = 0 THEN 0
                    ELSE ROUND((scheduled_reach::numeric / monthly_send_limit::numeric), 4)::float
                END AS quota_usage,
                active_access_code
            FROM company_rollups
            ORDER BY company_name
            """,
            from_date,
            to_date,
        )
    return [dict(row) for row in rows]


async def _estimate_reminder_recipients(
    connection: asyncpg.Connection,
    *,
    company_id: str,
    source_campaign_id: str,
    audience_rule: str,
) -> int:
    if audience_rule == "not_clicked":
        where_clause = "click_count = 0"
    else:
        where_clause = "click_count > 0 AND redeemed_count = 0"
    return await connection.fetchval(
        f"""
        SELECT COUNT(*)::int
        FROM campaign_links
        WHERE company_id = $1
          AND campaign_id = $2
          AND {where_clause}
        """,
        company_id,
        source_campaign_id,
    )


def _link_with_public_url(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "public_url": f"/r/{row['token']}"}


def _parse_timestamp(value: str | datetime | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _access_code_prefix(company_slug: str) -> str:
    prefix = re.sub(r"[^A-Z0-9]", "", company_slug.upper())[:8]
    return prefix or "COMPANY"


async def _create_company_access_code(
    connection: asyncpg.Connection,
    *,
    company_id: str,
    company_slug: str,
    role_slug: str,
    credit_limit: int | None,
) -> dict[str, Any]:
    prefix = _access_code_prefix(company_slug)
    for _ in range(5):
        code = f"{prefix}-{uuid4().hex[:6].upper()}"
        try:
            row = await connection.fetchrow(
                """
                INSERT INTO company_access_codes (code, company_id, role_slug, credit_limit)
                VALUES ($1, $2, $3, $4)
                RETURNING code, company_id, role_slug AS role, credit_limit, created_at, revoked_at
                """,
                code,
                company_id,
                role_slug,
                credit_limit,
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            continue
    raise RuntimeError("could not generate unique company access code")
