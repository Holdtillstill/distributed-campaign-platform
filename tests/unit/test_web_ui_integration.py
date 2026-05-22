from __future__ import annotations

import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_UI_DIR = REPO_ROOT / "apps" / "web-ui"
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"


def test_web_ui_package_declares_demo_dashboard_scripts() -> None:
    package = json.loads((WEB_UI_DIR / "package.json").read_text())

    assert package["scripts"]["build"] == "vite build"
    assert package["scripts"]["preview"] == "vite preview --host 0.0.0.0"
    assert {"@vitejs/plugin-react", "vite", "typescript"}.issubset(package["devDependencies"])


def test_web_ui_source_contains_campaign_demo_flows() -> None:
    source = (WEB_UI_DIR / "src" / "App.tsx").read_text()

    for expected in [
        "Create campaign",
        "Campaign status",
        "System status",
        "Dead-lettered",
        "fetch(`${API_BASE_URL}/campaigns`",
        "fetch(`${API_BASE_URL}/healthz`",
    ]:
        assert expected in source


def test_web_ui_dockerfile_serves_static_build_with_nginx() -> None:
    dockerfile = (WEB_UI_DIR / "Dockerfile").read_text()

    assert "FROM node:" in dockerfile
    assert "npm ci --include=dev" in dockerfile
    assert "npm run build" in dockerfile
    assert "FROM nginx:" in dockerfile
    assert "COPY --from=build /app/dist" in dockerfile


def test_compose_exposes_web_ui_on_localhost_8080() -> None:
    compose = yaml.safe_load((REPO_ROOT / "compose.yaml").read_text())
    web_ui = compose["services"]["web-ui"]

    assert web_ui["build"]["dockerfile"] == "apps/web-ui/Dockerfile"
    assert "127.0.0.1:8080:80" in web_ui["ports"]
    assert web_ui["depends_on"]["campaign-api"]["condition"] == "service_healthy"


def test_helm_chart_includes_web_ui_workload_and_service() -> None:
    values = yaml.safe_load((CHART_DIR / "values.yaml").read_text())
    apps_template = (CHART_DIR / "templates" / "apps.yaml").read_text()
    pdb_template = (CHART_DIR / "templates" / "pdb.yaml").read_text()
    network_policy_template = (CHART_DIR / "templates" / "networkpolicy.yaml").read_text()

    assert values["webUi"]["image"]["repository"] == "web-ui"
    assert values["webUi"]["service"]["port"] == 80
    assert values["webUi"]["apiBaseUrl"] == ""
    assert "app.kubernetes.io/component: web-ui" in apps_template
    assert "web-ui" in pdb_template
    assert "web-ui" in network_policy_template
