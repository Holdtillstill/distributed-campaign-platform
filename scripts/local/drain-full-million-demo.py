#!/usr/bin/env python3
"""Slowly drain the local full-million demo campaign for live monitor QA.

This script is intentionally local/dev-only. It updates queued message rows in
batches so the broadcast monitor can display a real multi-million counter moving
without publishing 2.65M individual NATS jobs from the controller.
"""

from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit(
        "Set DATABASE_URL for the local Postgres port-forward before draining the demo campaign."
    )
CAMPAIGN_ID = os.environ.get("CAMPAIGN_ID", "full-million-demo-20260529-2030")
BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "25000"))
SLEEP_SECONDS = float(os.environ.get("SLEEP_SECONDS", "5"))


async def drain() -> None:
    connection = await asyncpg.connect(DATABASE_URL)
    try:
        while True:
            result = await connection.execute(
                """
                WITH picked AS (
                    SELECT id
                    FROM messages
                    WHERE campaign_id = $1 AND status = 'queued'
                    ORDER BY id
                    LIMIT $2
                    FOR UPDATE SKIP LOCKED
                )
                UPDATE messages m
                SET status = 'sent', updated_at = NOW()
                FROM picked
                WHERE m.id = picked.id
                """,
                CAMPAIGN_ID,
                BATCH_SIZE,
            )
            updated = int(result.split()[-1]) if result.startswith("UPDATE ") else 0
            counts = await connection.fetchrow(
                """
                SELECT
                    COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
                    COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
                    COUNT(*)::int AS total
                FROM messages
                WHERE campaign_id = $1
                """,
                CAMPAIGN_ID,
            )
            queued = int(counts["queued"] or 0)
            sent = int(counts["sent"] or 0)
            total = int(counts["total"] or 0)
            print(
                (
                    f"{datetime.now(UTC).isoformat()} updated={updated} "
                    f"queued={queued} sent={sent} total={total}"
                ),
                flush=True,
            )
            if queued == 0:
                await connection.execute(
                    "UPDATE campaigns SET status = 'sent', updated_at = NOW() WHERE id = $1",
                    CAMPAIGN_ID,
                )
                print(
                    f"{datetime.now(UTC).isoformat()} completed campaign={CAMPAIGN_ID}",
                    flush=True,
                )
                break
            await asyncio.sleep(SLEEP_SECONDS)
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(drain())
