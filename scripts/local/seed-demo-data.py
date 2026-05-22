#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import asyncpg

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://campaign:campaign@localhost:5432/campaign_local")
COMPANY_ID = "demo-retail-co"
ACCESS_CODE = "DEMORETAIL-ADMIN"
ADMIN_EMAIL = "owner@demoretail.example"


def stable_id(kind: str, value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"campaign-platform/{kind}/{value}"))


async def main() -> None:
    connection = await asyncpg.connect(DATABASE_URL)
    try:
        schema = Path("apps/campaign-api/app/schema.sql").read_text(encoding="utf-8")
        await connection.execute(schema)
        async with connection.transaction():
            await connection.execute(
                """
                INSERT INTO companies (id, name, slug, monthly_send_limit, credit_balance)
                VALUES ($1, 'Demo Retail Co', 'demo-retail-co', 25000, 18000)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    slug = EXCLUDED.slug,
                    monthly_send_limit = EXCLUDED.monthly_send_limit,
                    credit_balance = GREATEST(companies.credit_balance, EXCLUDED.credit_balance),
                    status = 'active',
                    updated_at = NOW()
                """,
                COMPANY_ID,
            )
            user_id = stable_id("user", ADMIN_EMAIL)
            await connection.execute(
                """
                INSERT INTO users (id, email, display_name)
                VALUES ($1, $2, 'Demo Retail Owner')
                ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
                """,
                user_id,
                ADMIN_EMAIL,
            )
            await connection.execute(
                """
                INSERT INTO company_memberships (company_id, user_id, role_slug, credit_limit)
                VALUES ($1, $2, 'customer_admin', NULL)
                ON CONFLICT (company_id, user_id) DO UPDATE SET role_slug = EXCLUDED.role_slug
                """,
                COMPANY_ID,
                user_id,
            )
            await connection.execute(
                """
                INSERT INTO company_access_codes (code, company_id, role_slug)
                VALUES ($1, $2, 'customer_admin')
                ON CONFLICT (code) DO UPDATE SET revoked_at = NULL
                """,
                ACCESS_CODE,
                COMPANY_ID,
            )

            lists = ["Phoenix VIP", "Tucson Outlet", "Scottsdale Loyalty", "Winback"]
            list_ids: dict[str, str] = {}
            for name in lists:
                list_id = stable_id("subscriber-list", name)
                list_ids[name] = list_id
                await connection.execute(
                    """
                    INSERT INTO subscriber_lists (id, company_id, name)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
                    """,
                    list_id,
                    COMPANY_ID,
                    name,
                )

            subscribers = [
                ("+16025550101", "Phoenix VIP", "loyalty_export"),
                ("+16025550102", "Phoenix VIP", "pos"),
                ("+16025550103", "Phoenix VIP", "trade_show"),
                ("+15205550104", "Tucson Outlet", "store_signup"),
                ("+15205550105", "Tucson Outlet", "csv_import"),
                ("+15205550106", "Tucson Outlet", "pos"),
                ("+14805550107", "Scottsdale Loyalty", "loyalty_export"),
                ("+14805550108", "Scottsdale Loyalty", "vip_event"),
                ("+14805550109", "Scottsdale Loyalty", "checkout"),
                ("+16235550110", "Winback", "lapsed_customer_export"),
                ("+16235550111", "Winback", "lapsed_customer_export"),
                ("+16235550112", "Winback", "service_recovery"),
            ]
            for phone, list_name, source in subscribers:
                subscriber_id = stable_id("subscriber", phone)
                await connection.execute(
                    """
                    INSERT INTO subscribers (
                        id,
                        company_id,
                        phone_number,
                        marketing_status,
                        consent_status,
                        source
                    )
                    VALUES ($1, $2, $3, 'imported', 'company_provided', $4)
                    ON CONFLICT (company_id, phone_number) DO UPDATE SET
                        marketing_status = 'imported',
                        consent_status = 'company_provided',
                        source = EXCLUDED.source,
                        updated_at = NOW()
                    """,
                    subscriber_id,
                    COMPANY_ID,
                    phone,
                    source,
                )
                await connection.execute(
                    """
                    INSERT INTO subscriber_list_memberships (subscriber_list_id, subscriber_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                    """,
                    list_ids[list_name],
                    subscriber_id,
                )

            media_assets = [
                ("memorial-day-30-off.png", "https://cdn.example/retail/memorial-day-30-off.png"),
                ("vip-double-points.png", "https://cdn.example/retail/vip-double-points.png"),
                ("weekend-flash-sale.png", "https://cdn.example/retail/weekend-flash-sale.png"),
                ("winback-offer.png", "https://cdn.example/retail/winback-offer.png"),
            ]
            for filename, url in media_assets:
                await connection.execute(
                    """
                    INSERT INTO media_assets (id, company_id, filename, content_type, url)
                    VALUES ($1, $2, $3, 'image/png', $4)
                    ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url
                    """,
                    stable_id("media", filename),
                    COMPANY_ID,
                    filename,
                    url,
                )

            scheduled_at = datetime.now(UTC) + timedelta(days=7)
            campaigns = [
                (
                    "Memorial Day 30% Off",
                    "Memorial Day starts now: take 30% off summer favorites. Use code MEMORIAL30.",
                    "Phoenix VIP",
                    2,
                ),
                (
                    "VIP Double Points Weekend",
                    "VIP weekend: earn double points on every order through Sunday.",
                    "Scottsdale Loyalty",
                    1,
                ),
                (
                    "Winback Private Offer",
                    "We saved you $15 off your next visit this week.",
                    "Winback",
                    1,
                ),
            ]
            for index, (name, body, list_name, unit_cost) in enumerate(campaigns, start=1):
                campaign_id = stable_id("campaign", name)
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
                    VALUES ($1, $2, $3, $4, 'smart', 'scheduled', $5, $6)
                    ON CONFLICT (id) DO UPDATE SET
                        body = EXCLUDED.body,
                        status = EXCLUDED.status,
                        scheduled_at = EXCLUDED.scheduled_at,
                        credit_cost = EXCLUDED.credit_cost
                    """,
                    campaign_id,
                    COMPANY_ID,
                    name,
                    body,
                    scheduled_at + timedelta(days=index),
                    3 * unit_cost,
                )
                rows = await connection.fetch(
                    """
                    SELECT s.id, s.phone_number
                    FROM subscribers s
                    JOIN subscriber_list_memberships slm ON slm.subscriber_id = s.id
                    WHERE slm.subscriber_list_id = $1
                    ORDER BY s.phone_number
                    LIMIT 3
                    """,
                    list_ids[list_name],
                )
                for row in rows:
                    message_id = stable_id("message", f"{campaign_id}/{row['phone_number']}")
                    await connection.execute(
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
                        VALUES ($1, $2, $3, $4, $5, $6, 'queued', $7)
                        ON CONFLICT (id) DO NOTHING
                        """,
                        message_id,
                        COMPANY_ID,
                        campaign_id,
                        row["phone_number"],
                        row["id"],
                        body,
                        stable_id("idempotency", message_id),
                    )
    finally:
        await connection.close()

    print("Seeded Demo Retail Co")
    print(f"Customer app email: {ADMIN_EMAIL}")
    print(f"Access code: {ACCESS_CODE}")
    print(f"Company id: {COMPANY_ID}")


if __name__ == "__main__":
    asyncio.run(main())
