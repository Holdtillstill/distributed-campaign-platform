from __future__ import annotations

import importlib
import sys
from contextlib import suppress
from datetime import UTC, datetime, timedelta
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
            "sample_message_count": len(self.created_messages),
            "audience_mode": "actual",
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

    async def get_broadcast_monitor(self, campaign_id: str) -> dict[str, object] | None:
        if self.created_campaign is None or campaign_id != self.created_campaign["id"]:
            return None
        return {
            "campaign_id": self.created_campaign["id"],
            "company_id": self.created_campaign["company_id"],
            "campaign_name": self.created_campaign["name"],
            "status": "queued",
            "total_audience": len(self.created_messages),
            "modeled_audience": len(self.created_messages),
            "sample_message_count": len(self.created_messages),
            "mode": "actual",
            "queued": self.status_counts["queued"],
            "sent": self.status_counts["sent"],
            "failed": self.status_counts["failed"],
            "retried": self.status_counts["retried"],
            "dead_lettered": self.status_counts["dead_lettered"],
            "percent_complete": 0.0,
            "throughput_per_second": 0.0,
            "messages_per_minute": 0.0,
            "eta_seconds": None,
            "projected_completion_at": None,
            "started_at": None,
            "last_updated": None,
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
        "sample_message_count": 3,
        "audience_mode": "actual",
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


def test_get_broadcast_monitor_returns_live_counts(campaign_module, fake_repo) -> None:
    client = TestClient(campaign_module.app)
    client.post("/campaigns", json={"name": "launch", "recipients": ["+155****9999"]})

    response = client.get("/campaigns/campaign-test-1/broadcast-monitor")

    assert response.status_code == 200
    assert response.json()["campaign_id"] == "campaign-test-1"
    assert response.json()["queued"] == 1
    assert response.json()["mode"] == "actual"


def test_broadcast_monitor_calculates_projected_sample_eta(campaign_module) -> None:
    started_at = datetime(2026, 5, 28, 12, 0, tzinfo=UTC)
    last_updated = started_at + timedelta(minutes=2)

    monitor = campaign_module.db.calculate_broadcast_monitor(
        campaign_id="campaign-1",
        company_id="company-1",
        campaign_name="Scale send",
        status="queued",
        modeled_audience_count=1_000_000,
        audience_mode="projected_sample",
        created_at=started_at,
        campaign_updated_at=last_updated,
        first_message_created_at=started_at,
        last_message_updated_at=last_updated,
        sample_message_count=100,
        status_counts={
            "queued": 25,
            "sent": 70,
            "failed": 3,
            "retried": 2,
            "dead_lettered": 2,
        },
    )

    assert monitor["mode"] == "projected/sample"
    assert monitor["total_audience"] == 1_000_000
    assert monitor["percent_complete"] == 75.0
    assert monitor["messages_per_minute"] == 37.5
    assert monitor["eta_seconds"] == 40


def test_broadcast_monitor_derives_completed_status_and_clears_eta(campaign_module) -> None:
    started_at = datetime(2026, 5, 28, 12, 0, tzinfo=UTC)
    last_updated = started_at + timedelta(minutes=2)

    monitor = campaign_module.db.calculate_broadcast_monitor(
        campaign_id="campaign-1",
        company_id="company-1",
        campaign_name="Scale send",
        status="queued",
        modeled_audience_count=1_000_000,
        audience_mode="projected_sample",
        created_at=started_at,
        campaign_updated_at=started_at,
        first_message_created_at=started_at,
        last_message_updated_at=last_updated,
        sample_message_count=100,
        status_counts={
            "queued": 0,
            "sent": 100,
            "failed": 0,
            "retried": 0,
            "dead_lettered": 0,
        },
    )

    assert monitor["status"] == "sent"
    assert monitor["percent_complete"] == 100.0
    assert monitor["eta_seconds"] is None
    assert monitor["projected_completion_at"] == last_updated


def test_broadcast_monitor_waiting_campaign_has_no_started_timestamp(campaign_module) -> None:
    created_at = datetime(2026, 5, 28, 12, 0, tzinfo=UTC)

    monitor = campaign_module.db.calculate_broadcast_monitor(
        campaign_id="campaign-1",
        company_id="company-1",
        campaign_name="Scale send",
        status="scheduled",
        modeled_audience_count=2_650_000,
        audience_mode="actual",
        created_at=created_at,
        campaign_updated_at=created_at,
        first_message_created_at=created_at,
        last_message_updated_at=created_at,
        sample_message_count=2_650_000,
        status_counts={
            "queued": 2_650_000,
            "sent": 0,
            "failed": 0,
            "retried": 0,
            "dead_lettered": 0,
        },
    )

    assert monitor["status"] == "scheduled"
    assert monitor["started_at"] is None
    assert monitor["last_updated"] is None
    assert monitor["eta_seconds"] is None
    assert monitor["projected_completion_at"] is None


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
