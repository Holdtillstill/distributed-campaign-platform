from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from datetime import datetime
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


class FakeCreditRepository:
    def __init__(self, campaign_module) -> None:
        self._campaign_module = campaign_module
        self.created_campaign: dict[str, object] | None = None
        self.access_code_request: dict[str, object] | None = None
        self.updated_user: dict[str, object] | None = None

    async def create_campaign_with_messages(
        self,
        *,
        company_id: str,
        name: str,
        body: str,
        recipients: list[str] | None,
        subscriber_ids: list[str] | None = None,
        subscriber_list_ids: list[str] | None = None,
        message_type: str,
        media_asset_id: str | None = None,
        actor_email: str | None,
        scheduled_at: str | None = None,
    ) -> dict[str, object]:
        resolved_recipients = recipients or []
        if name == "Over quota":
            raise self._campaign_module.db.MonthlyQuotaExceededError(
                "monthly send quota exceeded",
                requested_reach=250_000,
                scheduled_reach=2_900_000,
                monthly_send_limit=3_000_000,
                quota_period_start=datetime.fromisoformat("2026-05-01T00:00:00+00:00"),
                quota_period_end=datetime.fromisoformat("2026-06-01T00:00:00+00:00"),
            )
        if message_type == "smart" and len(resolved_recipients) > 2:
            raise self._campaign_module.db.InsufficientCreditsError(
                "company credits exhausted",
                required_credits=6,
                available_credits=4,
            )
        self.created_campaign = {
            "company_id": company_id,
            "name": name,
            "body": body,
            "recipients": resolved_recipients,
            "message_type": message_type,
            "media_asset_id": media_asset_id,
            "actor_email": actor_email,
            "scheduled_at": scheduled_at,
        }
        credit_cost = (
            2 * len(resolved_recipients)
            if message_type == "smart"
            else len(resolved_recipients)
        )
        return {
            "id": "campaign-1",
            "company_id": company_id,
            "name": name,
            "message_type": message_type,
            "status": "queued",
            "scheduled_at": scheduled_at,
            "audience_count": len(resolved_recipients),
            "message_count": len(resolved_recipients),
            "credit_cost": credit_cost,
            "remaining_credits": 96,
            "tracked_links": [],
            "status_counts": {
                "queued": len(resolved_recipients),
                "sent": 0,
                "failed": 0,
                "retried": 0,
                "dead_lettered": 0,
            },
        }

    async def create_company_access_code(
        self,
        *,
        company_id: str,
        role_slug: str,
        credit_limit: int | None,
    ) -> dict[str, object] | None:
        self.access_code_request = {
            "company_id": company_id,
            "role_slug": role_slug,
            "credit_limit": credit_limit,
        }
        return {
            "code": "ACME-MGR1",
            "company_id": company_id,
            "role": role_slug,
            "credit_limit": credit_limit,
        }

    async def list_company_users(self, *, company_id: str) -> list[dict[str, object]]:
        return [
            {
                "user_id": "user-1",
                "email": "owner@acme.test",
                "display_name": "Acme Owner",
                "role": "customer_admin",
                "credit_limit": 2000,
                "credits_used": 125,
            }
        ]

    async def update_company_user(
        self,
        *,
        company_id: str,
        email: str,
        role_slug: str,
        credit_limit: int | None,
    ) -> dict[str, object] | None:
        self.updated_user = {
            "company_id": company_id,
            "email": email,
            "role_slug": role_slug,
            "credit_limit": credit_limit,
        }
        return {
            "user_id": "user-1",
            "email": email,
            "display_name": "Acme Owner",
            "role": role_slug,
            "credit_limit": credit_limit,
            "credits_used": 125,
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeCreditRepository(campaign_module)
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_credit_balances_user_budgets_and_campaign_costs() -> None:
    schema = SCHEMA_PATH.read_text()

    assert "credit_balance INTEGER NOT NULL DEFAULT 0" in schema
    assert "credit_limit INTEGER" in schema
    assert "credits_used INTEGER NOT NULL DEFAULT 0" in schema
    assert "message_type TEXT NOT NULL DEFAULT 'regular'" in schema
    assert "credit_cost INTEGER NOT NULL DEFAULT 0" in schema


def test_smart_campaign_charges_credits_and_tracks_actor_email(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1", "X-User-Email": "owner@acme.test"},
        json={
            "name": "Smart launch",
            "body": "Track this",
            "message_type": "smart",
            "media_asset_id": "media-1",
            "recipients": ["+15550001001", "+15550001002"],
        },
    )

    assert response.status_code == 201
    assert response.json()["message_type"] == "smart"
    assert response.json()["credit_cost"] == 4
    assert response.json()["remaining_credits"] == 96
    assert fake_repo.created_campaign == {
        "company_id": "company-1",
        "name": "Smart launch",
        "body": "Track this",
        "recipients": ["+15550001001", "+15550001002"],
        "message_type": "smart",
        "media_asset_id": "media-1",
        "actor_email": "owner@acme.test",
        "scheduled_at": None,
    }


def test_campaign_creation_blocks_when_credits_are_exhausted(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1"},
        json={
            "name": "Too big",
            "message_type": "smart",
            "media_asset_id": "media-1",
            "recipients": ["+15550001001", "+15550001002", "+15550001003"],
        },
    )

    assert response.status_code == 402
    assert response.json() == {
        "detail": {
            "message": "company credits exhausted",
            "required_credits": 6,
            "available_credits": 4,
        }
    }


def test_campaign_creation_blocks_when_monthly_quota_is_exhausted(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1"},
        json={
            "name": "Over quota",
            "message_type": "regular",
            "recipients": ["+15550001001"],
            "scheduled_at": "2026-05-25T16:00:00Z",
        },
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": {
            "message": "monthly send quota exceeded",
            "requested_reach": 250_000,
            "scheduled_reach": 2_900_000,
            "monthly_send_limit": 3_000_000,
            "available_reach": 100_000,
            "quota_period_start": "2026-05-01T00:00:00+00:00",
            "quota_period_end": "2026-06-01T00:00:00+00:00",
        }
    }


def test_smart_campaign_requires_media_asset(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1"},
        json={
            "name": "Missing media",
            "message_type": "smart",
            "recipients": ["+15550001001"],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "smart campaigns require a media_asset_id"


def test_company_admin_can_create_role_scoped_access_code(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/companies/company-1/access-codes",
        json={"role": "campaign_manager", "credit_limit": 2000},
    )

    assert response.status_code == 201
    assert response.json() == {
        "code": "ACME-MGR1",
        "company_id": "company-1",
        "role": "campaign_manager",
        "credit_limit": 2000,
    }
    assert fake_repo.access_code_request == {
        "company_id": "company-1",
        "role_slug": "campaign_manager",
        "credit_limit": 2000,
    }


def test_company_admin_can_list_and_update_user_roles_and_budgets(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    list_response = client.get("/companies/company-1/users")
    update_response = client.patch(
        "/companies/company-1/users/owner@acme.test",
        json={"role": "regional_manager", "credit_limit": 2500},
    )

    assert list_response.status_code == 200
    assert list_response.json()[0]["credit_limit"] == 2000
    assert update_response.status_code == 200
    assert update_response.json()["role"] == "regional_manager"
    assert update_response.json()["credit_limit"] == 2500
    assert fake_repo.updated_user == {
        "company_id": "company-1",
        "email": "owner@acme.test",
        "role_slug": "regional_manager",
        "credit_limit": 2500,
    }
