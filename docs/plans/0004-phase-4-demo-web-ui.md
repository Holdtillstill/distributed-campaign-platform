# Phase 4: Demo Web UI

**Status:** Complete and verified locally on kind.

## Objective

Add a lightweight browser-based dashboard so the platform can be demonstrated without curl-only workflows.

## Scope

- React + Vite single-page app under `apps/web-ui`
- Nginx static serving container
- Nginx `/api/*` reverse proxy to the Campaign API service
- Docker Compose service on `127.0.0.1:8080`
- Helm workload/service/PDB support for `web-ui`
- kind deployment script image build/load support

## Demo experience

The UI supports:

- campaign creation
- live campaign status polling
- queued/sent/failed/retried/dead-lettered counts
- system status checks against `/healthz`, `/readyz`, and `/metrics`
- link to FastAPI Swagger docs

## Local access

Docker Compose:

```bash
docker compose up --build -d
open http://127.0.0.1:8080
```

kind/Kubernetes:

```bash
kubectl -n campaign-platform port-forward svc/campaign-platform-web-ui 18080:80
open http://127.0.0.1:18080
```

The web UI calls the API through the same origin under `/api`, so browser access works cleanly through the web-ui service port-forward.

## Verification

Completed verification:

```bash
cd apps/web-ui && npm run build
```

```bash
ruff check .
python -m pytest -q
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform \
  --set observability.serviceMonitor.enabled=false \
  --set networkPolicy.enabled=false
```

kind smoke verification through the web UI service proxy:

```text
GET /                         200
GET /api/healthz              200
GET /api/readyz               200
GET /api/metrics              200
POST /api/campaigns           201
GET /api/campaigns/{id}       queued -> sent
```

Observed smoke result:

```text
queued: 0
sent: 2
failed: 0
retried: 0
dead_lettered: 0
```

## Follow-ups

- Add Playwright browser tests.
- Add Grafana dashboard links once dashboards exist.
- Add controls for provider simulation mode once the provider supports runtime reconfiguration.
