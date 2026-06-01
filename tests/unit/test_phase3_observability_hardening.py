from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"
OBSERVABILITY_DIR = REPO_ROOT / "platform" / "observability"


def _template_text() -> str:
    return "\n".join(path.read_text() for path in (CHART_DIR / "templates").glob("*.yaml"))


def test_app_chart_declares_resource_requests_limits_and_pdbs() -> None:
    values = (CHART_DIR / "values.yaml").read_text()
    templates = _template_text()

    assert "requests:" in values
    assert "limits:" in values
    assert "PodDisruptionBudget" in templates
    assert "minAvailable:" in templates


def test_app_chart_includes_network_policies_for_app_dependencies() -> None:
    templates = _template_text()

    assert "kind: NetworkPolicy" in templates
    assert "app.kubernetes.io/component: campaign-api" in templates
    assert "app.kubernetes.io/component: postgres" in templates
    assert "app.kubernetes.io/component: nats" in templates
    assert "app.kubernetes.io/component: provider-simulator" in templates


def test_app_chart_can_emit_service_monitor_resources() -> None:
    values = (CHART_DIR / "values.yaml").read_text()
    templates = _template_text()

    assert "serviceMonitor:" in values
    assert "natsio/prometheus-nats-exporter" in values
    assert "kind: ServiceMonitor" in templates
    assert "endpoints:" in templates
    assert "path: /metrics" in templates
    assert "app.kubernetes.io/component: nats" in templates
    assert "port: metrics" in templates


def test_app_chart_includes_actionable_prometheus_rules() -> None:
    values = (CHART_DIR / "values.yaml").read_text()
    templates = _template_text()

    assert "alerts:" in values
    assert "kind: PrometheusRule" in templates
    assert "CampaignApiHigh5xxRate" in templates
    assert "CampaignApiHighLatencyP95" in templates
    assert "CampaignDispatchDeadLetters" in templates
    assert "CampaignDispatcherHighLatencyP95" in templates
    assert "CampaignProviderHighLatencyP95" in templates
    assert "CampaignQueuedWithoutDispatch" in templates
    assert "CampaignNatsConsumerBacklog" in templates
    assert "jetstream_consumer_num_pending" in templates
    assert "CampaignNatsAckPending" in templates
    assert "CampaignNatsRedeliveries" in templates


def test_observability_stack_values_document_prometheus_loki_tempo_and_otel() -> None:
    expected_files = [
        "kube-prometheus-stack-values.yaml",
        "loki-values.yaml",
        "tempo-values.yaml",
        "opentelemetry-collector-values.yaml",
        "README.md",
    ]

    for file_name in expected_files:
        assert (OBSERVABILITY_DIR / file_name).exists(), file_name

    combined = "\n".join(
        (OBSERVABILITY_DIR / file_name).read_text() for file_name in expected_files
    )
    for expected in ["Prometheus", "Grafana", "Loki", "Tempo", "OpenTelemetry"]:
        assert expected in combined
