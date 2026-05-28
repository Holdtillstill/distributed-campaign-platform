#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import os
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

import asyncpg

REPO_ROOT = Path(__file__).resolve().parents[2]
SCHEMA_PATH = REPO_ROOT / "apps/campaign-api/app/schema.sql"

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://campaign:campaign@localhost:5432/campaign_local")
COMPANY_ID = os.getenv("DEMO_RETAIL_COMPANY_ID", "52570648-211f-4cbf-8920-2157ad3953f1")
COMPANY_SLUG = "demo-retail-co"
ACCESS_CODE = "DEMORETA-E568C9"
ADMIN_EMAIL = "owner@demo-retail.test"
MESSAGE_CREDIT_COSTS = {"regular": 1, "smart": 2}


@dataclass(frozen=True)
class DemoListDefinition:
    name: str
    count: int
    estimated_count: int
    region: str
    area_codes: tuple[str, ...]
    sources: tuple[str, ...]


@dataclass(frozen=True)
class DemoSubscriber:
    phone_number: str
    list_name: str
    source: str
    marketing_status: str
    consent_status: str
    created_at: datetime
    confirmed_at: datetime | None


@dataclass(frozen=True)
class DemoCampaignDefinition:
    name: str
    body: str
    list_name: str
    message_type: str
    status: str
    scheduled_offset_days: int | None


DEMO_SUBSCRIBER_LISTS: tuple[DemoListDefinition, ...] = (
    DemoListDefinition(
        name="Portland Weekend Shoppers",
        count=180,
        estimated_count=420_000,
        region="Portland",
        area_codes=("503", "971"),
        sources=("pos", "weekend_event", "loyalty_export", "qr_storefront"),
    ),
    DemoListDefinition(
        name="Seattle VIP Customers",
        count=140,
        estimated_count=275_000,
        region="Seattle",
        area_codes=("206", "425"),
        sources=("vip_event", "loyalty_export", "clienteling", "pos"),
    ),
    DemoListDefinition(
        name="Lapsed Loyalty Members",
        count=160,
        estimated_count=515_000,
        region="Southwest",
        area_codes=("602", "480"),
        sources=("lapsed_customer_export", "service_recovery", "loyalty_export"),
    ),
    DemoListDefinition(
        name="Online Cart Abandoners",
        count=120,
        estimated_count=360_000,
        region="Online",
        area_codes=("253", "360"),
        sources=("cart_recovery", "checkout_capture", "browse_abandonment"),
    ),
    DemoListDefinition(
        name="New Opt-ins",
        count=150,
        estimated_count=230_000,
        region="Arizona",
        area_codes=("623", "520"),
        sources=("landing_page", "qr_receipt", "popup_opt_in", "instagram_lead"),
    ),
    DemoListDefinition(
        name="High Value Repeat Buyers",
        count=110,
        estimated_count=185_000,
        region="Bay Area",
        area_codes=("415", "628"),
        sources=("loyalty_tier_export", "vip_event", "concierge_signup"),
    ),
    DemoListDefinition(
        name="Holiday Promo Audience",
        count=240,
        estimated_count=665_000,
        region="Mountain West",
        area_codes=("702", "725", "775"),
        sources=("holiday_landing_page", "gift_guide_signup", "seasonal_csv_import", "pos"),
    ),
)

DEMO_CAMPAIGNS: tuple[DemoCampaignDefinition, ...] = (
    DemoCampaignDefinition(
        name="Holiday Promo Audience Preview",
        body=(
            "Holiday preview: VIP early access opens Friday. "
            "Tap for gift-ready picks and a private 25% offer."
        ),
        list_name="Holiday Promo Audience",
        message_type="smart",
        status="scheduled",
        scheduled_offset_days=5,
    ),
    DemoCampaignDefinition(
        name="Portland Weekend Flash Sale",
        body=(
            "Portland weekend shoppers: bestsellers are back for 48 hours. "
            "Show this text for early access."
        ),
        list_name="Portland Weekend Shoppers",
        message_type="regular",
        status="scheduled",
        scheduled_offset_days=2,
    ),
    DemoCampaignDefinition(
        name="Seattle VIP Double Points",
        body=(
            "Seattle VIP weekend: earn double points on every purchase "
            "through Sunday with your member number."
        ),
        list_name="Seattle VIP Customers",
        message_type="smart",
        status="scheduled",
        scheduled_offset_days=7,
    ),
    DemoCampaignDefinition(
        name="Online Cart Rescue",
        body=(
            "Still thinking it over? Your cart is saved and shipping is free "
            "when you finish checkout today."
        ),
        list_name="Online Cart Abandoners",
        message_type="regular",
        status="queued",
        scheduled_offset_days=None,
    ),
    DemoCampaignDefinition(
        name="Spring Loyalty Winback",
        body="We saved you a private loyalty offer: take $15 off your next visit this week.",
        list_name="Lapsed Loyalty Members",
        message_type="regular",
        status="sent",
        scheduled_offset_days=-9,
    ),
    DemoCampaignDefinition(
        name="High Value Thank You Offer",
        body=(
            "Thanks for being one of our top customers. "
            "Your private preview pass is ready for this weekend."
        ),
        list_name="High Value Repeat Buyers",
        message_type="smart",
        status="sent",
        scheduled_offset_days=-4,
    ),
)


def stable_id(kind: str, value: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"campaign-platform/{kind}/{value}"))


def fake_phone_number(area_codes: Sequence[str], index: int) -> str:
    area_code = area_codes[index % len(area_codes)]
    line_number = 100 + (index // len(area_codes))
    return f"+1{area_code}555{line_number:04d}"


def build_demo_subscribers() -> list[DemoSubscriber]:
    subscribers: list[DemoSubscriber] = []
    created_base = datetime(2026, 1, 5, 9, 0, tzinfo=UTC)
    global_index = 0

    for subscriber_list in DEMO_SUBSCRIBER_LISTS:
        for list_index in range(subscriber_list.count):
            created_at = created_base + timedelta(minutes=global_index * 17)
            is_confirmed = list_index % 5 == 0
            source_name = subscriber_list.sources[list_index % len(subscriber_list.sources)]
            source = f"{subscriber_list.region}:{source_name}"
            subscribers.append(
                DemoSubscriber(
                    phone_number=fake_phone_number(subscriber_list.area_codes, list_index),
                    list_name=subscriber_list.name,
                    source=source,
                    marketing_status="confirmed" if is_confirmed else "imported",
                    consent_status=(
                        "double_opt_in_confirmed" if is_confirmed else "company_provided"
                    ),
                    created_at=created_at,
                    confirmed_at=created_at + timedelta(minutes=4) if is_confirmed else None,
                )
            )
            global_index += 1

    return subscribers


def expected_seed_counts() -> dict[str, int]:
    list_counts = {
        subscriber_list.name: subscriber_list.count
        for subscriber_list in DEMO_SUBSCRIBER_LISTS
    }
    modeled_list_counts = {
        subscriber_list.name: subscriber_list.estimated_count
        for subscriber_list in DEMO_SUBSCRIBER_LISTS
    }
    message_count = sum(list_counts[campaign.list_name] for campaign in DEMO_CAMPAIGNS)
    scheduled_reach = sum(
        list_counts[campaign.list_name]
        for campaign in DEMO_CAMPAIGNS
        if campaign.status == "scheduled"
    )
    modeled_scheduled_reach = sum(
        modeled_list_counts[campaign.list_name]
        for campaign in DEMO_CAMPAIGNS
        if campaign.status == "scheduled"
    )
    credit_cost = sum(
        list_counts[campaign.list_name] * MESSAGE_CREDIT_COSTS[campaign.message_type]
        for campaign in DEMO_CAMPAIGNS
    )
    return {
        "subscriber_count": sum(list_counts.values()),
        "modeled_subscriber_count": sum(modeled_list_counts.values()),
        "list_count": len(DEMO_SUBSCRIBER_LISTS),
        "campaign_count": len(DEMO_CAMPAIGNS),
        "message_count": message_count,
        "scheduled_reach": scheduled_reach,
        "modeled_scheduled_reach": modeled_scheduled_reach,
        "credit_cost": credit_cost,
    }


def print_seed_summary(*, dry_run: bool) -> None:
    counts = expected_seed_counts()
    list_counts = Counter(subscriber.list_name for subscriber in build_demo_subscribers())
    prefix = "Dry run" if dry_run else "Seeded"

    print(f"{prefix} Demo Retail Co")
    print(f"Company id: {COMPANY_ID}")
    print(f"Customer app email: {ADMIN_EMAIL}")
    print(f"Access code: {ACCESS_CODE}")
    print(
        "Planned counts: "
        f"{counts['subscriber_count']} sample subscribers, "
        f"{counts['modeled_subscriber_count']} modeled audience, "
        f"{counts['list_count']} lists, "
        f"{counts['campaign_count']} campaigns, "
        f"{counts['message_count']} sample messages, "
        f"{counts['scheduled_reach']} sample scheduled reach, "
        f"{counts['modeled_scheduled_reach']} modeled scheduled reach"
    )
    modeled_counts = {
        subscriber_list.name: subscriber_list.estimated_count
        for subscriber_list in DEMO_SUBSCRIBER_LISTS
    }
    for list_name, count in sorted(list_counts.items()):
        print(f"- {list_name}: {count} sample / {modeled_counts[list_name]} modeled")


async def seed_company(connection: asyncpg.Connection) -> None:
    await connection.execute(
        """
        UPDATE companies
        SET slug = CONCAT('demo-retail-co-legacy-', SUBSTRING(MD5(id), 1, 8)),
            name = CASE
                WHEN name = 'Demo Retail Co' THEN 'Demo Retail Co (legacy)'
                ELSE name
            END,
            updated_at = NOW()
        WHERE slug = $1
          AND id <> $2
        """,
        COMPANY_SLUG,
        COMPANY_ID,
    )
    await connection.execute(
        """
        INSERT INTO companies (id, name, slug, monthly_send_limit, credit_balance)
        VALUES ($1, 'Demo Retail Co', $2, 3000000, 4800000)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            monthly_send_limit = EXCLUDED.monthly_send_limit,
            credit_balance = GREATEST(companies.credit_balance, EXCLUDED.credit_balance),
            status = 'active',
            updated_at = NOW()
        """,
        COMPANY_ID,
        COMPANY_SLUG,
    )
    user_id = await connection.fetchval(
        """
        INSERT INTO users (id, email, display_name)
        VALUES ($1, $2, 'Demo Retail Owner')
        ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name
        RETURNING id
        """,
        stable_id("user", ADMIN_EMAIL),
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
        ON CONFLICT (code) DO UPDATE SET
            company_id = EXCLUDED.company_id,
            role_slug = EXCLUDED.role_slug,
            revoked_at = NULL
        """,
        ACCESS_CODE,
        COMPANY_ID,
    )


async def seed_subscriber_lists(connection: asyncpg.Connection) -> dict[str, str]:
    list_ids: dict[str, str] = {}
    for subscriber_list in DEMO_SUBSCRIBER_LISTS:
        list_id = await connection.fetchval(
            """
            INSERT INTO subscriber_lists (id, company_id, name, estimated_subscriber_count)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (company_id, name) DO UPDATE SET
                name = EXCLUDED.name,
                estimated_subscriber_count = EXCLUDED.estimated_subscriber_count
            RETURNING id
            """,
            stable_id("subscriber-list", f"{COMPANY_ID}/{subscriber_list.name}"),
            COMPANY_ID,
            subscriber_list.name,
            subscriber_list.estimated_count,
        )
        list_ids[subscriber_list.name] = list_id
    return list_ids


async def seed_subscribers(connection: asyncpg.Connection, list_ids: dict[str, str]) -> None:
    subscribers = build_demo_subscribers()
    await connection.executemany(
        """
        INSERT INTO subscribers (
            id,
            company_id,
            phone_number,
            marketing_status,
            consent_status,
            source,
            confirmed_at,
            created_at,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
        ON CONFLICT (company_id, phone_number) DO UPDATE SET
            marketing_status = EXCLUDED.marketing_status,
            consent_status = EXCLUDED.consent_status,
            source = EXCLUDED.source,
            confirmed_at = EXCLUDED.confirmed_at,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at
        """,
        [
            (
                stable_id("subscriber", f"{COMPANY_ID}/{subscriber.phone_number}"),
                COMPANY_ID,
                subscriber.phone_number,
                subscriber.marketing_status,
                subscriber.consent_status,
                subscriber.source,
                subscriber.confirmed_at,
                subscriber.created_at,
            )
            for subscriber in subscribers
        ],
    )
    phone_numbers = [subscriber.phone_number for subscriber in subscribers]
    rows = await connection.fetch(
        """
        SELECT id, phone_number
        FROM subscribers
        WHERE company_id = $1
          AND phone_number = ANY($2::text[])
        """,
        COMPANY_ID,
        phone_numbers,
    )
    subscriber_id_by_phone = {row["phone_number"]: row["id"] for row in rows}
    await connection.execute(
        """
        DELETE FROM subscriber_list_memberships
        WHERE subscriber_list_id = ANY($1::text[])
        """,
        list(list_ids.values()),
    )
    await connection.executemany(
        """
        INSERT INTO subscriber_list_memberships (subscriber_list_id, subscriber_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        """,
        [
            (
                list_ids[subscriber.list_name],
                subscriber_id_by_phone[subscriber.phone_number],
            )
            for subscriber in subscribers
        ],
    )


async def seed_media_assets(connection: asyncpg.Connection) -> None:
    media_assets = [
        ("holiday-preview-25-off.png", "https://cdn.example/retail/holiday-preview-25-off.png"),
        ("portland-weekend-flash.png", "https://cdn.example/retail/portland-weekend-flash.png"),
        ("seattle-vip-double-points.png", "https://cdn.example/retail/seattle-vip-double-points.png"),
        ("cart-rescue-free-shipping.png", "https://cdn.example/retail/cart-rescue-free-shipping.png"),
        ("winback-private-offer.png", "https://cdn.example/retail/winback-private-offer.png"),
        ("high-value-preview-pass.png", "https://cdn.example/retail/high-value-preview-pass.png"),
    ]
    await connection.executemany(
        """
        INSERT INTO media_assets (id, company_id, filename, content_type, url)
        VALUES ($1, $2, $3, 'image/png', $4)
        ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url
        """,
        [
            (
                stable_id("media", f"{COMPANY_ID}/{filename}"),
                COMPANY_ID,
                filename,
                url,
            )
            for filename, url in media_assets
        ],
    )


async def seed_campaigns(connection: asyncpg.Connection, list_ids: dict[str, str]) -> None:
    now = datetime.now(UTC).replace(microsecond=0)
    modeled_count_by_list = {
        subscriber_list.name: subscriber_list.estimated_count
        for subscriber_list in DEMO_SUBSCRIBER_LISTS
    }
    for campaign in DEMO_CAMPAIGNS:
        campaign_id = stable_id("campaign", f"{COMPANY_ID}/{campaign.name}")
        scheduled_at = (
            now + timedelta(days=campaign.scheduled_offset_days)
            if campaign.scheduled_offset_days is not None
            else None
        )
        rows = await connection.fetch(
            """
            SELECT s.id, s.phone_number
            FROM subscribers s
            JOIN subscriber_list_memberships slm ON slm.subscriber_id = s.id
            WHERE slm.subscriber_list_id = $1
              AND s.company_id = $2
            ORDER BY s.phone_number
            """,
            list_ids[campaign.list_name],
            COMPANY_ID,
        )
        unit_cost = MESSAGE_CREDIT_COSTS[campaign.message_type]
        credit_cost = len(rows) * unit_cost
        modeled_audience_count = max(modeled_count_by_list[campaign.list_name], len(rows))
        audience_mode = "projected_sample" if modeled_audience_count > len(rows) else "actual"
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
                modeled_audience_count,
                audience_mode,
                credit_cost
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                body = EXCLUDED.body,
                message_type = EXCLUDED.message_type,
                status = EXCLUDED.status,
                scheduled_at = EXCLUDED.scheduled_at,
                modeled_audience_count = EXCLUDED.modeled_audience_count,
                audience_mode = EXCLUDED.audience_mode,
                credit_cost = EXCLUDED.credit_cost,
                updated_at = NOW()
            """,
            campaign_id,
            COMPANY_ID,
            campaign.name,
            campaign.body,
            campaign.message_type,
            campaign.status,
            scheduled_at,
            modeled_audience_count,
            audience_mode,
            credit_cost,
        )
        message_status = "sent" if campaign.status == "sent" else "queued"
        message_rows = [
            (
                stable_id("message", f"{campaign_id}/{row['phone_number']}"),
                COMPANY_ID,
                campaign_id,
                row["phone_number"],
                row["id"],
                campaign.body,
                message_status,
                stable_id("idempotency", f"{campaign_id}/{row['phone_number']}"),
            )
            for row in rows
        ]
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
            ON CONFLICT (id) DO UPDATE SET
                body = EXCLUDED.body,
                status = EXCLUDED.status,
                updated_at = NOW()
            """,
            message_rows,
        )
        await connection.execute(
            """
            DELETE FROM messages
            WHERE campaign_id = $1
              AND NOT (id = ANY($2::text[]))
            """,
            campaign_id,
            [row[0] for row in message_rows],
        )


async def seed_database() -> None:
    connection = await asyncpg.connect(DATABASE_URL)
    try:
        schema = SCHEMA_PATH.read_text(encoding="utf-8")
        await connection.execute(schema)
        async with connection.transaction():
            await seed_company(connection)
            list_ids = await seed_subscriber_lists(connection)
            await seed_subscribers(connection, list_ids)
            await seed_media_assets(connection)
            await seed_campaigns(connection, list_ids)
    finally:
        await connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed local Demo Retail Co tenant data.")
    parser.add_argument(
        "--dry-run",
        "--sanity",
        action="store_true",
        dest="dry_run",
        help="Print deterministic seed counts without connecting to Postgres.",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    if args.dry_run:
        print_seed_summary(dry_run=True)
        return

    await seed_database()
    print_seed_summary(dry_run=False)


if __name__ == "__main__":
    asyncio.run(main())
