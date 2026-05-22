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


class FakeSubscriberRepository:
    def __init__(self) -> None:
        self.created_list: dict[str, object] | None = None
        self.imported_subscriber: dict[str, object] | None = None
        self.started_opt_in: dict[str, object] | None = None
        self.confirmed_token: str | None = None

    async def create_subscriber_list(self, *, company_id: str, name: str) -> dict[str, object]:
        self.created_list = {"company_id": company_id, "name": name}
        return {"id": "list-1", "company_id": company_id, "name": name, "subscriber_count": 0}

    async def import_subscriber(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        list_id: str | None,
    ) -> dict[str, object]:
        self.imported_subscriber = {
            "company_id": company_id,
            "phone_number": phone_number,
            "source": source,
            "list_id": list_id,
        }
        return {
            "id": "subscriber-1",
            "company_id": company_id,
            "phone_number": phone_number,
            "marketing_status": "imported",
            "consent_status": "company_provided",
            "list_id": list_id,
        }

    async def start_double_opt_in(
        self,
        *,
        company_id: str,
        phone_number: str,
        source: str,
        ip_address: str | None,
        user_agent: str | None,
    ) -> dict[str, object]:
        self.started_opt_in = {
            "company_id": company_id,
            "phone_number": phone_number,
            "source": source,
            "ip_address": ip_address,
            "user_agent": user_agent,
        }
        return {
            "subscriber_id": "subscriber-2",
            "company_id": company_id,
            "phone_number": phone_number,
            "status": "pending_confirmation",
            "confirmation_token": "token-123",
        }

    async def confirm_double_opt_in(self, *, token: str) -> dict[str, object] | None:
        self.confirmed_token = token
        if token != "token-123":
            return None
        return {
            "subscriber_id": "subscriber-2",
            "company_id": "company-1",
            "phone_number": "+155****5002",
            "status": "confirmed",
        }

    async def create_campaign_with_messages(self, **kwargs):
        raise NotImplementedError

    async def get_campaign_status(self, campaign_id: str):
        raise NotImplementedError

    async def create_company_with_admin(self, **kwargs):
        raise NotImplementedError

    async def list_user_memberships(self, **kwargs):
        raise NotImplementedError


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeSubscriberRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_schema_defines_subscribers_consent_suppression_and_double_opt_in_tables() -> None:
    schema = SCHEMA_PATH.read_text()

    for table in [
        "subscriber_lists",
        "subscribers",
        "subscriber_list_memberships",
        "consent_events",
        "suppression_list",
        "double_opt_in_tokens",
    ]:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in schema

    assert "double_opt_in_requested" in schema
    assert "double_opt_in_confirmed" in schema
    assert "idx_subscribers_company_phone" in schema


def test_customer_can_create_subscriber_list(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/companies/company-1/subscriber-lists",
        json={"name": "VIP Customers"},
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": "list-1",
        "company_id": "company-1",
        "name": "VIP Customers",
        "subscriber_count": 0,
    }
    assert fake_repo.created_list == {"company_id": "company-1", "name": "VIP Customers"}


def test_customer_can_import_company_provided_subscriber(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/companies/company-1/subscribers",
        json={
            "phone_number": "+155****5001",
            "source": "csv_import",
            "list_id": "list-1",
        },
    )

    assert response.status_code == 201
    assert response.json()["consent_status"] == "company_provided"
    assert response.json()["marketing_status"] == "imported"
    assert fake_repo.imported_subscriber == {
        "company_id": "company-1",
        "phone_number": "+155****5001",
        "source": "csv_import",
        "list_id": "list-1",
    }


def test_public_double_opt_in_starts_pending_confirmation(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/public/opt-ins",
        headers={"User-Agent": "pytest-browser"},
        json={
            "company_id": "company-1",
            "phone_number": "+155****5002",
            "source": "landing_page",
        },
    )

    assert response.status_code == 202
    assert response.json() == {
        "subscriber_id": "subscriber-2",
        "company_id": "company-1",
        "phone_number": "+155****5002",
        "status": "pending_confirmation",
        "confirmation_token": "token-123",
    }
    assert fake_repo.started_opt_in["user_agent"] == "pytest-browser"


def test_public_double_opt_in_confirmation_records_confirmed_consent(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post("/public/opt-ins/token-123/confirm")

    assert response.status_code == 200
    assert response.json() == {
        "subscriber_id": "subscriber-2",
        "company_id": "company-1",
        "phone_number": "+155****5002",
        "status": "confirmed",
    }
    assert fake_repo.confirmed_token == "token-123"


def test_unknown_double_opt_in_token_returns_404(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post("/public/opt-ins/unknown/confirm")

    assert response.status_code == 404
    assert response.json() == {"detail": "confirmation token not found"}
