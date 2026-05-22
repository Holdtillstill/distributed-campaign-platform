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


class FakeTenantRepository:
    def __init__(self) -> None:
        self.company_request: dict[str, object] | None = None
        self.campaign_request: dict[str, object] | None = None

    async def create_company_with_admin(
        self,
        *,
        name: str,
        slug: str,
        admin_email: str,
        monthly_send_limit: int | None = None,
        credit_balance: int = 0,
    ) -> dict[str, object]:
        self.company_request = {
            "name": name,
            "slug": slug,
            "admin_email": admin_email,
            "monthly_send_limit": monthly_send_limit,
            "credit_balance": credit_balance,
        }
        return {
            "id": "company-1",
            "name": name,
            "slug": slug,
            "monthly_send_limit": monthly_send_limit,
            "credit_balance": credit_balance,
            "access_code": "ACME-1234",
            "admin_user": {
                "id": "user-1",
                "email": admin_email,
                "role": "customer_admin",
            },
        }

    async def list_user_memberships(self, *, email: str) -> list[dict[str, object]]:
        return [
            {
                "company_id": "company-1",
                "company_name": "Acme Retail",
                "company_slug": "acme-retail",
                "role": "customer_admin",
                "credit_limit": None,
                "credits_used": 0,
            }
        ]

    async def create_campaign_with_messages(
        self,
        *,
        company_id: str,
        name: str,
        body: str,
        recipients: list[str] | None,
        subscriber_ids: list[str] | None = None,
        subscriber_list_ids: list[str] | None = None,
        message_type: str = "regular",
        media_asset_id: str | None = None,
        actor_email: str | None = None,
        scheduled_at: str | None = None,
    ) -> dict[str, object]:
        resolved_recipients = recipients or []
        self.campaign_request = {
            "company_id": company_id,
            "name": name,
            "body": body,
            "recipients": resolved_recipients,
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
            "status": "queued",
            "scheduled_at": scheduled_at,
            "audience_count": len(resolved_recipients),
            "message_count": len(resolved_recipients),
            "credit_cost": len(resolved_recipients),
            "remaining_credits": 999,
            "tracked_links": [],
            "status_counts": {
                "queued": len(resolved_recipients),
                "sent": 0,
                "failed": 0,
                "retried": 0,
                "dead_lettered": 0,
            },
        }

    async def get_campaign_status(self, campaign_id: str) -> dict[str, object] | None:
        if campaign_id != "campaign-1":
            return None
        return {
            "id": "campaign-1",
            "company_id": "company-1",
            "name": "launch",
            "status_counts": {
                "queued": 1,
                "sent": 0,
                "failed": 0,
                "retried": 0,
                "dead_lettered": 0,
            },
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeTenantRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_tenant_user_rbac_and_audit_tables() -> None:
    schema = SCHEMA_PATH.read_text()

    for table in ["companies", "users", "roles", "company_memberships", "audit_events"]:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in schema

    for role in [
        "internal_admin",
        "customer_admin",
        "campaign_manager",
        "analyst",
        "viewer",
    ]:
        assert role in schema

    assert "ALTER TABLE campaigns" in schema
    assert "ALTER TABLE messages" in schema
    assert "company_id TEXT" in schema
    assert "monthly_send_limit INTEGER" in schema
    assert "CREATE TABLE IF NOT EXISTS company_access_codes" in schema
    assert "revoked_at TIMESTAMPTZ" in schema
    assert "idx_campaigns_company_id" in schema


def test_internal_admin_can_create_customer_company_with_quota_and_access_code(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/admin/companies",
        headers={"X-Internal-Admin": "true"},
        json={
            "name": "Acme Retail",
            "slug": "acme-retail",
            "admin_email": "admin@acme.example",
            "monthly_send_limit": 50000,
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": "company-1",
        "name": "Acme Retail",
        "slug": "acme-retail",
        "monthly_send_limit": 50000,
        "credit_balance": 0,
        "access_code": "ACME-1234",
        "admin_user": {
            "id": "user-1",
            "email": "admin@acme.example",
            "role": "customer_admin",
        },
    }
    assert fake_repo.company_request == {
        "name": "Acme Retail",
        "slug": "acme-retail",
        "admin_email": "admin@acme.example",
        "monthly_send_limit": 50000,
        "credit_balance": 0,
    }


def test_customer_company_creation_requires_internal_admin(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/admin/companies",
        json={
            "name": "Acme Retail",
            "slug": "acme-retail",
            "admin_email": "admin@acme.example",
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "internal admin access required"}
    assert fake_repo.company_request is None


def test_me_memberships_uses_authenticated_user_email(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/me/memberships", headers={"X-User-Email": "admin@acme.example"})

    assert response.status_code == 200
    assert response.json() == [
        {
            "company_id": "company-1",
            "company_name": "Acme Retail",
            "company_slug": "acme-retail",
            "role": "customer_admin",
            "credit_limit": None,
            "credits_used": 0,
        }
    ]


def test_campaign_creation_is_scoped_to_company_header(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        headers={"X-Company-Id": "company-1"},
        json={"name": "launch", "body": "hello", "recipients": ["+155****1001"]},
    )

    assert response.status_code == 201
    assert response.json()["company_id"] == "company-1"
    assert fake_repo.campaign_request == {
        "company_id": "company-1",
        "name": "launch",
        "body": "hello",
        "recipients": ["+155****1001"],
        "message_type": "regular",
        "media_asset_id": None,
        "actor_email": None,
        "scheduled_at": None,
    }
