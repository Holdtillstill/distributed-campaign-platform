from __future__ import annotations

import json
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
WEB_UI_DIR = REPO_ROOT / "apps" / "web-ui"
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"
COMPOSE_FILE = REPO_ROOT / "compose.yaml"


def test_web_ui_has_vite_react_application_scaffold() -> None:
    package_json = json.loads((WEB_UI_DIR / "package.json").read_text())

    assert package_json["scripts"]["build"] == "vite build"
    assert package_json["scripts"]["test"] == "NODE_ENV=development vitest run"
    assert "@vitejs/plugin-react" in package_json["devDependencies"]
    assert "vite" in package_json["devDependencies"]
    assert "react" in package_json["dependencies"]
    assert "react-dom" in package_json["dependencies"]

    for path in [
        WEB_UI_DIR / "index.html",
        WEB_UI_DIR / "src" / "App.tsx",
        WEB_UI_DIR / "src" / "main.tsx",
        WEB_UI_DIR / "Dockerfile",
        WEB_UI_DIR / "nginx.conf.template",
    ]:
        assert path.exists(), f"missing {path.relative_to(REPO_ROOT)}"


def test_web_ui_implements_campaign_demo_experience() -> None:
    app_source = (WEB_UI_DIR / "src" / "App.tsx").read_text()

    for expected_text in [
        "Distributed Campaign Platform",
        "Create campaign",
        "Campaign status",
        "System status",
        "queued",
        "sent",
        "retried",
        "dead_lettered",
        "API_BASE_URL",
    ]:
        assert expected_text in app_source


def test_compose_runs_web_ui_as_an_extra_service() -> None:
    compose = yaml.safe_load(COMPOSE_FILE.read_text())
    web_ui = compose["services"]["web-ui"]

    assert web_ui["build"]["dockerfile"] == "apps/web-ui/Dockerfile"
    assert web_ui["environment"]["CAMPAIGN_API_UPSTREAM"] == "http://campaign-api:8080"
    assert "127.0.0.1:8080:80" in web_ui["ports"]
    assert web_ui["depends_on"]["campaign-api"]["condition"] == "service_healthy"


def test_helm_chart_runs_web_ui_workload_with_runtime_api_proxy() -> None:
    values = yaml.safe_load((CHART_DIR / "values.yaml").read_text())
    apps_template = (CHART_DIR / "templates" / "apps.yaml").read_text()

    assert values["webUi"]["image"]["repository"] == "web-ui"
    assert values["webUi"]["service"]["port"] == 80
    assert values["webUi"]["campaignApiUpstream"] == "http://campaign-platform-campaign-api:8080"
    assert "app.kubernetes.io/component: web-ui" in apps_template
    assert "CAMPAIGN_API_UPSTREAM" in apps_template
