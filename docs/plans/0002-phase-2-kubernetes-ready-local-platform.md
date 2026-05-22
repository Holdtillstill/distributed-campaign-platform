# Phase 2: Kubernetes-ready local platform

**Status:** Complete and verified locally.

## Objective

Prepare the Phase 1 distributed app for Kubernetes deployment before introducing AWS/EKS cost or complexity.

## Scope completed

- FastAPI services expose Kubernetes-friendly endpoints:
  - `GET /healthz` for liveness
  - `GET /readyz` for readiness
  - `GET /metrics` for Prometheus scraping
- NATS integration now defaults to JetStream:
  - stream: `CAMPAIGN_MESSAGES`
  - subject: `messages.dispatch`
  - dispatcher durable consumer: `dispatcher`
- Helm chart added at `deploy/helm/campaign-platform` for:
  - Campaign API
  - Provider Simulator
  - Dispatcher
  - PostgreSQL
  - Redis
  - NATS with JetStream enabled
- kind cluster config added at `deploy/kind/cluster.yaml`.
- Local kind deploy helper added at `scripts/local/kind-deploy.sh`.
- Tests cover readiness/metrics endpoints, JetStream defaults, and manifest scaffolding.

## Verification

```bash
. .venv/bin/activate && ruff check . && python -m pytest -q
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform >/tmp/campaign-platform-rendered.yaml
docker compose build
docker compose up --detach
scripts/local/e2e-smoke-test.sh
```

Latest verified results:

- `41 passed`
- Helm lint: `1 chart(s) linted, 0 chart(s) failed`
- Compose smoke test: `Smoke test passed: 3/3 messages reached terminal status.`

## Follow-up candidates

- Add a real Prometheus/Grafana stack and ServiceMonitor resources.
- Add retry scheduling and dead-letter stream handling instead of marking `429` as terminal `retried`.
- Add NetworkPolicies, resource requests/limits, and PodDisruptionBudgets.
- Add CI that runs pytest, ruff, helm lint/template, and Docker build checks.
