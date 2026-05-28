from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


EXPECTED_DOCS = [
    "docs/product/sms-saas-product-doc.md",
    "docs/architecture/architecture.md",
    "docs/architecture/architecture-diagram.mmd",
    "docs/runbooks/local-demo.md",
    "docs/runbooks/observability.md",
    "docs/kb/customer-user-guide.md",
    "docs/kb/internal-admin-guide.md",
]


def test_documentation_set_exists_and_is_linked_from_readme() -> None:
    readme = (REPO_ROOT / "README.md").read_text()

    for relative_path in EXPECTED_DOCS:
        path = REPO_ROOT / relative_path
        assert path.exists(), f"missing {relative_path}"
        content = path.read_text()
        if path.suffix == ".md":
            assert content.startswith("# "), f"{relative_path} needs a top-level heading"
        if path.suffix == ".mmd":
            assert content.startswith("flowchart"), f"{relative_path} should be raw Mermaid"
        assert f"]({relative_path})" in readme, f"README does not link {relative_path}"


def test_observability_runbook_documents_trace_review_flow() -> None:
    content = (REPO_ROOT / "docs" / "runbooks" / "observability.md").read_text()

    for expected in [
        "kubectl -n observability port-forward svc/kube-prometheus-stack-grafana 3000:80",
        "kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090:9090",
        "kubectl -n observability port-forward svc/tempo 3200:3200",
        "GET /api/observability/trace-smoke",
        "Grafana Explore",
        "Tempo",
        "service.name",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
    ]:
        assert expected in content


def test_architecture_doc_links_the_mermaid_diagram() -> None:
    content = (REPO_ROOT / "docs" / "architecture" / "architecture.md").read_text()
    diagram = (REPO_ROOT / "docs" / "architecture" / "architecture-diagram.mmd").read_text()

    assert "architecture-diagram.mmd" in content
    assert "flowchart" in diagram
    assert "OpenTelemetry Collector" in diagram
