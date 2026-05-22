from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

CAMPAIGN_APP_DIR = Path(__file__).resolve().parents[2] / "apps" / "campaign-api" / "app"


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


class FakeDashboardRepository:
    async def get_company_dashboard_summary(self, *, company_id: str) -> dict[str, object] | None:
        if company_id != "company-1":
            return None
        return {
            "company_id": "company-1",
            "company_name": "Acme Retail",
            "monthly_send_limit": 50000,
            "credit_balance": 42000,
            "subscriber_count": 123,
            "campaign_count": 4,
            "message_count": 1000,
            "credits_used": 8000,
            "click_count": 123,
            "redemption_count": 45,
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeDashboardRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_company_dashboard_summary_returns_tenant_totals(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/companies/company-1/dashboard-summary")

    assert response.status_code == 200
    assert response.json() == {
        "company_id": "company-1",
        "company_name": "Acme Retail",
        "monthly_send_limit": 50000,
        "credit_balance": 42000,
        "subscriber_count": 123,
        "campaign_count": 4,
        "message_count": 1000,
        "credits_used": 8000,
        "click_count": 123,
        "redemption_count": 45,
    }


def test_company_dashboard_summary_returns_404_for_unknown_company(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/companies/missing-company/dashboard-summary")

    assert response.status_code == 404
    assert response.json() == {"detail": "company not found"}
