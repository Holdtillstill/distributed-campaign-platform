from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DASHBOARD_DIR = REPO_ROOT / "platform" / "observability" / "dashboards"
SCRIPT = REPO_ROOT / "scripts" / "local" / "install-observability-dashboards.sh"


def test_essential_grafana_dashboards_are_valid_json_with_expected_panels() -> None:
    expected = {
        "campaign-platform-essential-overview.json": "Campaign Platform Essential Overview",
        "kubernetes-essential-overview.json": "Kubernetes Essential Overview",
    }

    for file_name, title in expected.items():
        dashboard = json.loads((DASHBOARD_DIR / file_name).read_text())
        assert dashboard["title"] == title
        assert dashboard["uid"]
        assert len(dashboard["panels"]) >= 6
        assert dashboard["refresh"] == "10s"


def test_campaign_dashboard_contains_portfolio_service_queries() -> None:
    dashboard = json.loads(
        (DASHBOARD_DIR / "campaign-platform-essential-overview.json").read_text()
    )
    queries = "\n".join(
        target["expr"] for panel in dashboard["panels"] for target in panel["targets"]
    )

    assert 'namespace="campaign-platform"' in queries
    assert "campaign_api_service_info" in queries
    assert "dispatcher_service_info" in queries
    assert "provider_simulator_service_info" in queries
    assert "campaign_api_http_requests_total" in queries
    assert "campaign_api_http_request_duration_seconds_bucket" in queries
    assert "campaign_api_campaign_messages_total" in queries
    assert "dispatcher_dispatcher_messages_total" in queries
    assert "provider_simulator_provider_requests_total" in queries
    assert "jetstream_consumer_num_pending" in queries
    assert "jetstream_consumer_num_ack_pending" in queries
    assert "jetstream_consumer_num_redelivered" in queries


def test_dashboard_install_script_labels_configmap_for_grafana_sidecar() -> None:
    script = SCRIPT.read_text()

    assert "grafana_dashboard=1" in script
    assert "campaign-platform-grafana-dashboards" in script
    assert "kubernetes-essential-overview.json" in script
    assert "campaign-platform-essential-overview.json" in script
