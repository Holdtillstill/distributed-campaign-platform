from __future__ import annotations

import os
from pathlib import Path
from typing import Any

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
    campaign_id: str,
    name: str,
    body: str,
    messages: list[dict[str, Any]],
) -> None:
    async with pool.acquire() as connection, connection.transaction():
        await connection.execute(
            """
                INSERT INTO campaigns (id, name, body)
                VALUES ($1, $2, $3)
                """,
            campaign_id,
            name,
            body,
        )
        await connection.executemany(
            """
                INSERT INTO messages (
                    id,
                    campaign_id,
                    recipient,
                    body,
                    status,
                    idempotency_key
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
            [
                (
                    message["message_id"],
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
            SELECT id, name
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

    return {"id": campaign["id"], "name": campaign["name"], "status_counts": counts}
