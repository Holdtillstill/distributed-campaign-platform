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


class FakeAccessCodeRepository:
    def __init__(self) -> None:
        self.signup_calls = 0

    async def signup_with_access_code(
        self,
        *,
        email: str,
        name: str,
        access_code: str,
    ) -> dict[str, object] | None:
        self.signup_calls += 1
        if access_code != "ACME-1234":
            return None
        return {
            "role": "company_user",
            "email": email,
            "company_id": "company-1",
            "company_name": "Acme Retail",
            "membership_role": "customer_admin",
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeAccessCodeRepository()
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_valid_access_code_signs_user_into_company(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/signup/access-code",
        json={
            "email": "owner@acme.example",
            "name": "Acme Owner",
            "access_code": "ACME-1234",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "role": "company_user",
        "email": "owner@acme.example",
        "company_id": "company-1",
        "company_name": "Acme Retail",
        "membership_role": "customer_admin",
    }
    assert fake_repo.signup_calls == 1


def test_invalid_access_code_is_rejected(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/signup/access-code",
        json={
            "email": "owner@acme.example",
            "name": "Acme Owner",
            "access_code": "NOPE-0000",
        },
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "access code not found"}


def test_access_code_signup_can_be_replayed_without_duplicate_membership(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)
    payload = {
        "email": "owner@acme.example",
        "name": "Acme Owner",
        "access_code": "ACME-1234",
    }

    first_response = client.post("/signup/access-code", json=payload)
    second_response = client.post("/signup/access-code", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 201
    assert second_response.json()["company_id"] == "company-1"
    assert fake_repo.signup_calls == 2
