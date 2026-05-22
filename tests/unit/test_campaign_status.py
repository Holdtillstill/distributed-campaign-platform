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


class FakeRepository:
    def __init__(self, campaign_module) -> None:
        self._campaign_module = campaign_module
        self.created_campaign: dict[str, object] | None = None
        self.created_messages: list[dict[str, object]] = []
        self.status_counts: dict[str, int] = {}

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
        campaign_id = "campaign-test-1"
        self.created_campaign = {
            "id": campaign_id,
            "company_id": company_id,
            "name": name,
            "body": body,
            "message_type": message_type,
            "media_asset_id": media_asset_id,
            "actor_email": actor_email,
            "scheduled_at": scheduled_at,
        }
        resolved_recipients = recipients or []
        self.created_messages = [
            row.model_dump() if hasattr(row, "model_dump") else dict(row)
            for row in self._campaign_module.build_message_rows(
                campaign_id,
                resolved_recipients,
                body,
            )
        ]
        self.status_counts = self._campaign_module.aggregate_status_counts(
            self.created_messages
        )
        return {
            "id": campaign_id,
            "company_id": company_id,
            "name": name,
            "body": body,
            "message_type": message_type,
            "status": "queued",
            "scheduled_at": scheduled_at,
            "audience_count": len(self.created_messages),
            "message_count": len(self.created_messages),
            "credit_cost": len(self.created_messages),
            "remaining_credits": 997,
            "tracked_links": [],
            "status_counts": self.status_counts,
        }

    async def get_campaign_status(self, campaign_id: str) -> dict[str, object] | None:
        if self.created_campaign is None or campaign_id != self.created_campaign["id"]:
            return None
        return {
            "id": self.created_campaign["id"],
            "company_id": self.created_campaign["company_id"],
            "name": self.created_campaign["name"],
            "status_counts": self.status_counts,
        }


@pytest.fixture()
def fake_repo(campaign_module):
    repo = FakeRepository(campaign_module)
    campaign_module.app.dependency_overrides[campaign_module.get_repository] = lambda: repo
    try:
        yield repo
    finally:
        campaign_module.app.dependency_overrides.clear()


def test_healthz_returns_ok(campaign_module) -> None:
    client = TestClient(campaign_module.app)

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "campaign-api"}


def test_post_campaign_creates_campaign_with_synthetic_recipients(
    campaign_module,
    fake_repo,
) -> None:
    client = TestClient(campaign_module.app)

    response = client.post("/campaigns", json={"name": "launch", "body": "hello"})

    assert response.status_code == 201
    assert response.json() == {
        "id": "campaign-test-1",
        "company_id": "demo-company",
        "name": "launch",
        "message_type": "regular",
        "status": "queued",
        "scheduled_at": None,
        "audience_count": 3,
        "message_count": 3,
        "credit_cost": 3,
        "remaining_credits": 997,
        "tracked_links": [],
        "status_counts": {
            "queued": 3,
            "sent": 0,
            "failed": 0,
            "retried": 0,
            "dead_lettered": 0,
        },
    }
    assert fake_repo.created_campaign == {
        "id": "campaign-test-1",
        "company_id": "demo-company",
        "name": "launch",
        "body": "hello",
        "message_type": "regular",
        "media_asset_id": None,
        "actor_email": None,
        "scheduled_at": None,
    }
    assert [row["recipient"] for row in fake_repo.created_messages] == [
        "+15550001001",
        "+15550001002",
        "+15550001003",
    ]


def test_post_campaign_rejects_duplicate_recipients(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)

    response = client.post(
        "/campaigns",
        json={"name": "launch", "recipients": ["+155****9999", "+155****9999"]},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "recipients must be unique"}
    assert fake_repo.created_campaign is None


def test_get_campaign_status_returns_aggregate_counts(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)
    client.post("/campaigns", json={"name": "launch", "recipients": ["+155****9999"]})

    response = client.get("/campaigns/campaign-test-1")

    assert response.status_code == 200
    assert response.json() == {
        "id": "campaign-test-1",
        "company_id": "demo-company",
        "name": "launch",
        "status_counts": {
            "queued": 1,
            "sent": 0,
            "failed": 0,
            "retried": 0,
            "dead_lettered": 0,
        },
    }


def test_aggregate_status_counts_includes_zero_for_missing_statuses(campaign_module) -> None:
    messages = [
        {"status": "queued"},
        {"status": "queued"},
        {"status": "sent"},
        {"status": "failed"},
        {"status": "retried"},
        {"status": "dead_lettered"},
    ]

    counts = campaign_module.aggregate_status_counts(messages)

    assert counts == {
        "queued": 2,
        "sent": 1,
        "failed": 1,
        "retried": 1,
        "dead_lettered": 1,
    }
    assert campaign_module.aggregate_status_counts([]) == {
        "queued": 0,
        "sent": 0,
        "failed": 0,
        "retried": 0,
        "dead_lettered": 0,
    }


def test_default_recipients_are_deterministic(campaign_module) -> None:
    assert campaign_module.default_recipients() == [
        "+15550001001",
        "+15550001002",
        "+15550001003",
    ]


def test_build_message_rows_are_queued_with_stable_idempotency_keys(campaign_module) -> None:
    first = campaign_module.build_message_rows("campaign-1", ["+15550001001"], "hello")
    second = campaign_module.build_message_rows("campaign-1", ["+15550001001"], "hello")

    assert len(first) == 1
    assert first[0].status == "queued"
    assert first[0].campaign_id == "campaign-1"
    assert first[0].recipient == "+15550001001"
    assert first[0].body == "hello"
    assert first[0].idempotency_key == second[0].idempotency_key
    assert first[0].message_id == second[0].message_id
    assert len(first[0].idempotency_key) == 64
