from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from datetime import date
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


class FakeReminderUsageRepository:
    def __init__(self) -> None:
        self.created_reminder: dict[str, object] | None = None
        self.usage_range: tuple[date, date] | None = None
        self.health_range: tuple[date, date] | None = None

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
            "created_at": "2026-05-21T00:00:00Z",
        }

    async def list_reminder_campaigns(self, *, company_id: str) -> list[dict[str, object]]:
        return [
            {
                "id": "reminder-1",
                "company_id": company_id,
                "source_campaign_id": "campaign-1",
                "audience_rule": "not_clicked",
                "message_body": "Last chance",
                "status": "draft",
                "estimated_recipient_count": 2,
                "created_at": "2026-05-21T00:00:00Z",
            }
        ]

    async def get_admin_usage(self, *, from_date: date, to_date: date) -> list[dict[str, object]]:
        self.usage_range = (from_date, to_date)
        return [
            {
                "company_id": "company-1",
                "company_name": "Acme Retail",
                "campaign_count": 3,
                "message_count": 12,
                "media_asset_count": 2,
                "tracked_link_count": 4,
                "click_count": 9,
                "redemption_count": 5,
                "reminder_count": 1,
            }
        ]

    async def get_admin_company_health(
        self,
        *,
        from_date: date,
        to_date: date,
    ) -> list[dict[str, object]]:
        self.health_range = (from_date, to_date)
        return [
            {
                "company_id": "company-1",
                "company_name": "Acme Retail",
                "subscriber_count": 1200,
                "campaign_count": 14,
                "scheduled_reach": 850,
                "credits_remaining": 9200,
                "monthly_send_limit": 10000,
                "quota_usage": 0.85,
                "active_access_code": "ACME-1234",
            }
        ]


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeReminderUsageRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_reminder_campaigns() -> None:
    schema = SCHEMA_PATH.read_text()

    assert "CREATE TABLE IF NOT EXISTS reminder_campaigns" in schema
    assert "source_campaign_id TEXT NOT NULL REFERENCES campaigns(id)" in schema
    assert "audience_rule TEXT NOT NULL" in schema
    assert "estimated_recipient_count INTEGER NOT NULL DEFAULT 0" in schema
    assert "idx_reminder_campaigns_company_id" in schema


def test_customer_can_create_and_list_reminder_campaigns(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    create_response = client.post(
        "/companies/company-1/reminder-campaigns",
        json={
            "source_campaign_id": "campaign-1",
            "audience_rule": "not_clicked",
            "message_body": "Last chance",
        },
    )
    list_response = client.get("/companies/company-1/reminder-campaigns")

    assert create_response.status_code == 201
    assert create_response.json()["id"] == "reminder-1"
    assert create_response.json()["estimated_recipient_count"] == 2
    assert list_response.status_code == 200
    assert list_response.json()[0]["audience_rule"] == "not_clicked"
    assert fake_repo.created_reminder == {
        "company_id": "company-1",
        "source_campaign_id": "campaign-1",
        "audience_rule": "not_clicked",
        "message_body": "Last chance",
    }


def test_reminder_campaign_rejects_unknown_audience_rule(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/companies/company-1/reminder-campaigns",
        json={
            "source_campaign_id": "campaign-1",
            "audience_rule": "everyone",
            "message_body": "Last chance",
        },
    )

    assert response.status_code == 422
    assert fake_repo.created_reminder is None


def test_internal_admin_can_load_usage_dashboard(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get(
        "/admin/usage?from=2026-05-01&to=2026-05-21",
        headers={"X-Internal-Admin": "true"},
    )

    assert response.status_code == 200
    assert fake_repo.usage_range == (date(2026, 5, 1), date(2026, 5, 21))
    assert response.json() == [
        {
            "company_id": "company-1",
            "company_name": "Acme Retail",
            "campaign_count": 3,
            "message_count": 12,
            "media_asset_count": 2,
            "tracked_link_count": 4,
            "click_count": 9,
            "redemption_count": 5,
            "reminder_count": 1,
        }
    ]


def test_admin_usage_requires_internal_admin_header(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/admin/usage?from=2026-05-01&to=2026-05-21")

    assert response.status_code == 403
    assert response.json() == {"detail": "internal admin access required"}


def test_internal_admin_can_load_company_health_breakdown(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get(
        "/admin/company-health?from=2026-05-22&to=2026-06-21",
        headers={"X-Internal-Admin": "true"},
    )

    assert response.status_code == 200
    assert fake_repo.health_range == (date(2026, 5, 22), date(2026, 6, 21))
    assert response.json() == [
        {
            "company_id": "company-1",
            "company_name": "Acme Retail",
            "subscriber_count": 1200,
            "campaign_count": 14,
            "scheduled_reach": 850,
            "credits_remaining": 9200,
            "monthly_send_limit": 10000,
            "quota_usage": 0.85,
            "active_access_code": "ACME-1234",
        }
    ]


def test_admin_company_health_requires_internal_admin_header(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/admin/company-health?from=2026-05-22&to=2026-06-21")

    assert response.status_code == 403
    assert response.json() == {"detail": "internal admin access required"}
