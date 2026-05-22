from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

CAMPAIGN_APP_DIR = Path(__file__).resolve().parents[2] / "apps" / "campaign-api" / "app"
SCHEMA_PATH = CAMPAIGN_APP_DIR / "schema.sql"


@pytest.fixture()
def campaign_module():
    sys.path.insert(0, str(CAMPAIGN_APP_DIR))
    sys.modules.pop("main", None)
    sys.modules.pop("db", None)
    try:
        yield importlib.import_module("main")
    finally:
        sys.modules.pop("main", None)
        sys.modules.pop("db", None)
        with suppress(ValueError):
            sys.path.remove(str(CAMPAIGN_APP_DIR))


class FakePlanningRepository:
    def __init__(self, campaign_module) -> None:
        self._campaign_module = campaign_module
        self.created_campaign: dict[str, object] | None = None
        self.created_reminder: dict[str, object] | None = None

    async def list_subscriber_lists(self, *, company_id: str) -> list[dict[str, object]]:
        return [
            {
                "id": "list-vip",
                "company_id": company_id,
                "name": "VIP Customers",
                "subscriber_count": 2,
            },
            {
                "id": "list-west",
                "company_id": company_id,
                "name": "West Region",
                "subscriber_count": 1,
            },
        ]

    async def list_subscribers(self, *, company_id: str) -> list[dict[str, object]]:
        return [
            {
                "id": "subscriber-1",
                "company_id": company_id,
                "phone_number": "+15550001001",
                "marketing_status": "confirmed",
                "consent_status": "double_opt_in_confirmed",
                "list_id": "list-vip",
            },
            {
                "id": "subscriber-2",
                "company_id": company_id,
                "phone_number": "+15550001002",
                "marketing_status": "imported",
                "consent_status": "company_provided",
                "list_id": "list-west",
            },
        ]

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
    ) -> dict[str, object]:
        self.created_campaign = {
            "company_id": company_id,
            "name": name,
            "body": body,
            "recipients": recipients,
            "subscriber_ids": subscriber_ids,
            "subscriber_list_ids": subscriber_list_ids,
            "message_type": message_type,
            "media_asset_id": media_asset_id,
            "actor_email": actor_email,
            "scheduled_at": scheduled_at,
        }
        return {
            "id": "campaign-1",
            "company_id": company_id,
            "name": name,
            "message_type": message_type,
            "status": "scheduled",
            "scheduled_at": scheduled_at,
            "audience_count": 3,
            "message_count": 3,
            "credit_cost": 6,
            "remaining_credits": 994,
            "tracked_links": [
                {
                    "subscriber_id": "subscriber-1",
                    "media_asset_id": media_asset_id,
                    "public_url": "/r/spring-token-1",
                },
                {
                    "subscriber_id": "subscriber-2",
                    "media_asset_id": media_asset_id,
                    "public_url": "/r/spring-token-2",
                },
            ]
            if message_type == "smart" and media_asset_id
            else [],
            "status_counts": {
                "queued": 3,
                "sent": 0,
                "failed": 0,
                "retried": 0,
                "dead_lettered": 0,
            },
        }

    async def create_reminder_campaign(
        self,
        *,
        company_id: str,
        source_campaign_id: str,
        audience_rule: str,
        message_body: str,
    ) -> dict[str, object]:
        self.created_reminder = {
            "company_id": company_id,
            "source_campaign_id": source_campaign_id,
            "audience_rule": audience_rule,
            "message_body": message_body,
        }
        return {
            "id": "reminder-1",
            "company_id": company_id,
            "source_campaign_id": source_campaign_id,
            "audience_rule": audience_rule,
            "message_body": message_body,
            "status": "draft",
            "estimated_recipient_count": 2,
            "created_at": "2026-05-22T05:00:00Z",
        }

    async def list_campaigns(self, *, company_id: str) -> list[dict[str, object]]:
        return [
            {
                "id": "campaign-upcoming",
                "company_id": company_id,
                "name": "Memorial Day Promo",
                "message_type": "smart",
                "status": "scheduled",
                "scheduled_at": "2026-05-25T16:00:00Z",
                "created_at": "2026-05-22T05:00:00Z",
                "message_count": 2,
                "credit_cost": 4,
                "reminder_count": 0,
            },
            {
                "id": "campaign-past",
                "company_id": company_id,
                "name": "Spring Launch",
                "message_type": "regular",
                "status": "sent",
                "scheduled_at": "2026-05-20T16:00:00Z",
                "created_at": "2026-05-20T15:00:00Z",
                "message_count": 10,
                "credit_cost": 10,
                "reminder_count": 1,
            },
        ]


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakePlanningRepository(campaign_module)
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_campaign_planning_fields() -> None:
    schema = SCHEMA_PATH.read_text()

    assert "scheduled_at TIMESTAMPTZ" in schema
    assert "status TEXT NOT NULL DEFAULT 'queued'" in schema
    assert "subscriber_id TEXT REFERENCES subscribers(id)" in schema
    assert "idx_campaigns_company_scheduled" in schema


def test_customer_can_list_subscriber_audiences(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    lists_response = client.get("/companies/company-1/subscriber-lists")
    subscribers_response = client.get("/companies/company-1/subscribers")

    assert lists_response.status_code == 200
    assert lists_response.json()[0] == {
        "id": "list-vip",
        "company_id": "company-1",
        "name": "VIP Customers",
        "subscriber_count": 2,
    }
    assert subscribers_response.status_code == 200
    assert subscribers_response.json()[0]["id"] == "subscriber-1"


def test_campaign_can_be_scheduled_for_existing_subscriber_segments(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1", "X-User-Email": "owner@acme.test"},
        json={
            "name": "Memorial Day Promo",
            "body": "Early access starts now",
            "message_type": "smart",
            "media_asset_id": "media-1",
            "subscriber_list_ids": ["list-vip"],
            "subscriber_ids": ["subscriber-2"],
            "scheduled_at": "2026-05-25T16:00:00Z",
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "scheduled"
    assert response.json()["scheduled_at"] == "2026-05-25T16:00:00Z"
    assert response.json()["audience_count"] == 3
    assert response.json()["tracked_links"] == [
        {
            "subscriber_id": "subscriber-1",
            "media_asset_id": "media-1",
            "public_url": "/r/spring-token-1",
        },
        {
            "subscriber_id": "subscriber-2",
            "media_asset_id": "media-1",
            "public_url": "/r/spring-token-2",
        },
    ]
    assert fake_repo.created_campaign == {
        "company_id": "company-1",
        "name": "Memorial Day Promo",
        "body": "Early access starts now",
        "recipients": None,
        "subscriber_ids": ["subscriber-2"],
        "subscriber_list_ids": ["list-vip"],
        "message_type": "smart",
        "media_asset_id": "media-1",
        "actor_email": "owner@acme.test",
        "scheduled_at": "2026-05-25T16:00:00Z",
    }


def test_customer_can_list_upcoming_and_past_campaigns(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/companies/company-1/campaigns")

    assert response.status_code == 200
    assert [campaign["id"] for campaign in response.json()] == [
        "campaign-upcoming",
        "campaign-past",
    ]
    assert response.json()[0]["status"] == "scheduled"
    assert response.json()[1]["reminder_count"] == 1


def test_reminder_follow_up_is_created_against_a_recent_campaign(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/companies/company-1/reminder-campaigns",
        json={
            "source_campaign_id": "campaign-past",
            "audience_rule": "clicked_not_redeemed",
            "message_body": "Last chance to redeem",
        },
    )

    assert response.status_code == 201
    assert fake_repo.created_reminder == {
        "company_id": "company-1",
        "source_campaign_id": "campaign-past",
        "audience_rule": "clicked_not_redeemed",
        "message_body": "Last chance to redeem",
    }
