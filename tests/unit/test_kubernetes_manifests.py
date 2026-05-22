from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"


def test_phase2_helm_chart_contains_core_workloads_and_probes() -> None:
    assert (CHART_DIR / "Chart.yaml").exists()
    assert (CHART_DIR / "values.yaml").exists()

    rendered_templates = "\n".join(
        path.read_text() for path in (CHART_DIR / "templates").glob("*.yaml")
    )

    for workload in ["campaign-api", "dispatcher", "provider-simulator"]:
        assert f"app.kubernetes.io/component: {workload}" in rendered_templates

    assert "readinessProbe:" in rendered_templates
    assert "livenessProbe:" in rendered_templates
    assert "path: /readyz" in rendered_templates
    assert "path: /healthz" in rendered_templates
    assert "path: /metrics" in rendered_templates


def test_kind_overlay_documents_local_cluster_install_path() -> None:
    kind_config = REPO_ROOT / "deploy" / "kind" / "cluster.yaml"
    deploy_script = REPO_ROOT / "scripts" / "local" / "kind-deploy.sh"

    assert kind_config.exists()
    assert deploy_script.exists()
    assert "kind: Cluster" in kind_config.read_text()
    assert "helm upgrade --install campaign-platform" in deploy_script.read_text()
