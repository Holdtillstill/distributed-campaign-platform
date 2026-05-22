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


class FakeAdminSummaryRepository:
    async def get_admin_dashboard_summary(self) -> dict[str, int]:
        return {
            "company_count": 10,
            "active_company_count": 9,
            "total_credit_balance": 92000,
            "active_access_code_count": 6,
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeAdminSummaryRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_internal_admin_dashboard_summary_counts_companies(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/admin/dashboard-summary", headers={"X-Internal-Admin": "true"})

    assert response.status_code == 200
    assert response.json() == {
        "company_count": 10,
        "active_company_count": 9,
        "total_credit_balance": 92000,
        "active_access_code_count": 6,
    }


def test_non_internal_admin_cannot_read_admin_dashboard_summary(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/admin/dashboard-summary")

    assert response.status_code == 403
