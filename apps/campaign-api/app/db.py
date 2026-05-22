from __future__ import annotations

import os
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
