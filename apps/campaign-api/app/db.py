from __future__ import annotations

import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import uuid4

import asyncpg

DEFAULT_DATABASE_URL = "postgresql://campaign:campaign@localhost:5432/campaign_local"
SCHEMA_PATH = Path(__file__).with_name("schema.sql")


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
    messages: list[dict[str, Any]],
) -> None:
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute(
            """
                INSERT INTO campaigns (id, company_id, name, body)
                VALUES ($1, $2, $3, $4)
                """,
            campaign_id,
            company_id,
            name,
            body,
        )
        await connection.executemany(
            """
                INSERT INTO messages (
                    id,
                    company_id,
                    campaign_id,
                    recipient,
                    body,
                    status,
                    idempotency_key
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                """,
            [
                (
                    message["message_id"],
                    company_id,
                    message["campaign_id"],
                    message["recipient"],
                    message["body"],
                    message["status"],
                    message["idempotency_key"],
                )
                for message in messages
            ],
        )


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
) -> dict[str, Any]:
    company_id = str(uuid4())
    user_id = str(uuid4())
    audit_id = str(uuid4())
    async with pool.acquire() as connection, connection.transaction():
        company = await connection.fetchrow(
            """
            INSERT INTO companies (id, name, slug)
            VALUES ($1, $2, $3)
            RETURNING id, name, slug
            """,
            company_id,
            name,
            slug,
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

    return {
        "id": company["id"],
        "name": company["name"],
        "slug": company["slug"],
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
                cm.role_slug AS role
            FROM users u
            JOIN company_memberships cm ON cm.user_id = u.id
            JOIN companies c ON c.id = cm.company_id
            WHERE u.email = $1
            ORDER BY c.name
            """,
            email,
        )
    return [dict(row) for row in rows]


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
    return {**dict(subscriber), "list_id": list_id}


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
                destination_url,
                click_count,
                media_asset_id
            """,
            token,
        )
        if link is None:
            return None
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


def _link_with_public_url(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "public_url": f"/r/{row['token']}"}
