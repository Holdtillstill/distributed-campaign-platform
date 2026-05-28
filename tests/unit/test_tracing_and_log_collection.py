from __future__ import annotations

import importlib
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"
OBS_DIR = REPO_ROOT / "platform" / "observability"


def test_shared_tracing_module_exposes_fastapi_and_message_context_helpers() -> None:
    tracing = importlib.import_module("campaign_common.tracing")

    assert hasattr(tracing, "configure_tracing")
    assert hasattr(tracing, "instrument_fastapi_app")
    assert hasattr(tracing, "inject_trace_context")
    assert hasattr(tracing, "extract_trace_context")
    assert tracing.otel_endpoint_from_env({}) is None
    assert tracing.otel_endpoint_from_env({"OTEL_EXPORTER_OTLP_ENDPOINT": "http://otel:4317"}) == "http://otel:4317"


def test_trace_context_round_trip_in_message_metadata() -> None:
    tracing = importlib.import_module("campaign_common.tracing")

    payload: dict[str, object] = {"message_id": "msg-1"}
    carrier = tracing.inject_trace_context(payload, traceparent="00-abc-123-01")

    assert payload == {"message_id": "msg-1"}
    assert carrier["message_id"] == "msg-1"
    assert carrier["trace_context"] == {"traceparent": "00-abc-123-01"}
    assert tracing.extract_trace_context(carrier) == {"traceparent": "00-abc-123-01"}


def test_campaign_platform_chart_sets_otel_env_for_python_services() -> None:
    rendered = _helm_template(CHART_DIR)
    deployments = {
        item["metadata"]["labels"]["app.kubernetes.io/component"]: item
        for item in rendered
        if item and item.get("kind") == "Deployment"
    }

    for component in ["campaign-api", "dispatcher", "provider-simulator"]:
        env = _container_env(deployments[component])
        assert env["OTEL_EXPORTER_OTLP_ENDPOINT"].startswith("http://otel-collector")
        assert env["OTEL_TRACES_EXPORTER"] == "otlp"
        assert env["OTEL_SERVICE_NAME"] == component

    assert "OTEL_EXPORTER_OTLP_ENDPOINT" not in _container_env(deployments["web-ui"])


def test_network_policy_allows_observability_namespace_for_metrics_and_traces() -> None:
    rendered = _helm_template(CHART_DIR)
    policies = {
        item["metadata"]["name"]: item
        for item in rendered
        if item and item.get("kind") == "NetworkPolicy"
    }
    app_policy = policies["campaign-platform-app-dependencies"]

    observability_ingress_ports = [
        port["port"]
        for rule in app_policy["spec"]["ingress"]
        if _has_observability_namespace_selector(rule)
        for port in rule.get("ports", [])
    ]
    observability_egress_ports = [
        port["port"]
        for rule in app_policy["spec"]["egress"]
        if _has_observability_namespace_selector(rule)
        for port in rule.get("ports", [])
    ]

    assert 8080 in observability_ingress_ports
    assert 4317 in observability_egress_ports
    assert 4318 in observability_egress_ports


def test_alloy_values_collect_kubernetes_pod_logs_to_loki() -> None:
    values = yaml.safe_load((OBS_DIR / "alloy-values.yaml").read_text())
    config = values["alloy"]["configMap"]["content"]

    assert "loki.write" in config
    assert "loki.source.kubernetes" in config
    assert "loki.process" in config
    assert "loki-gateway.observability.svc.cluster.local" in config
    assert "app_kubernetes_io_component" in config


def test_tempo_values_enable_otlp_receivers_on_service_ports() -> None:
    values = yaml.safe_load((OBS_DIR / "tempo-values.yaml").read_text())
    protocols = values["tempo"]["receivers"]["otlp"]["protocols"]

    assert protocols["grpc"]["endpoint"] == "0.0.0.0:4317"
    assert protocols["http"]["endpoint"] == "0.0.0.0:4318"


def test_grafana_datasources_include_loki_and_tempo() -> None:
    values = yaml.safe_load((OBS_DIR / "kube-prometheus-stack-values.yaml").read_text())
    datasources = values["grafana"]["additionalDataSources"]
    by_name = {datasource["name"]: datasource for datasource in datasources}

    assert by_name["Loki"]["type"] == "loki"
    assert by_name["Loki"]["uid"] == "loki"
    assert by_name["Loki"]["url"] == "http://loki-gateway.observability.svc.cluster.local"
    assert by_name["Tempo"]["type"] == "tempo"
    assert by_name["Tempo"]["uid"] == "tempo"
    assert by_name["Tempo"]["url"] == "http://tempo.observability.svc.cluster.local:3200"
    assert by_name["Tempo"]["jsonData"]["tracesToLogsV2"]["datasourceUid"] == "loki"


def test_python_service_dockerfiles_install_otel_dependencies() -> None:
    for dockerfile in [
        REPO_ROOT / "apps" / "campaign-api" / "Dockerfile",
        REPO_ROOT / "apps" / "dispatcher" / "Dockerfile",
        REPO_ROOT / "apps" / "provider-simulator" / "Dockerfile",
    ]:
        content = dockerfile.read_text()
        assert "opentelemetry-sdk" in content
        assert "opentelemetry-exporter-otlp" in content
        assert "opentelemetry-instrumentation-fastapi" in content


def _helm_template(chart_dir: Path) -> list[dict]:
    import subprocess

    result = subprocess.run(
        ["helm", "template", "campaign-platform", str(chart_dir)],
        check=True,
        capture_output=True,
        text=True,
    )
    return [doc for doc in yaml.safe_load_all(result.stdout) if doc]


def _container_env(deployment: dict) -> dict[str, str]:
    container = deployment["spec"]["template"]["spec"]["containers"][0]
    return {item["name"]: item["value"] for item in container.get("env", [])}


def _has_observability_namespace_selector(rule: dict) -> bool:
    peers = rule.get("from", []) + rule.get("to", [])
    return any(
        peer.get("namespaceSelector", {}).get("matchLabels", {}).get("kubernetes.io/metadata.name")
        == "observability"
        for peer in peers
    )
