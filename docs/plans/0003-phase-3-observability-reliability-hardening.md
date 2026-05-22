# Phase 3: Observability, Reliability, and Kubernetes Hardening

**Status:** Complete and verified locally.

## Objective

Add the first production-style platform controls on top of the Kubernetes-ready local platform: observability stack wiring, retry/dead-letter behavior, and baseline Kubernetes hardening.

## Scope completed

### Observability stack scaffolding

Added Helm values and install notes under `platform/observability` for:

- Prometheus/Alertmanager/Grafana via `kube-prometheus-stack`
- Loki for logs
- Tempo for traces
- OpenTelemetry Collector for OTLP traces, metrics, and logs

The app chart can now emit Prometheus Operator `ServiceMonitor` resources for:

- Campaign API
- Provider Simulator
- Dispatcher

### Reliability controls

Dispatcher now models transient provider failures as retryable outcomes before dead-lettering:

- transient statuses: `429`, `500`, `502`, `503`, `504`
- configurable max attempts via `DISPATCHER_MAX_ATTEMPTS`
- retry subject: `messages.dispatch.retry`
- dead-letter subject: `messages.dispatch.dead_letter`
- default max attempts: `3`

The dispatcher subscribes to both the primary dispatch subject and retry subject, republishes retry payloads with incremented `retry_count`, and publishes exhausted messages to the dead-letter subject.

### Kubernetes hardening

The app Helm chart now includes:

- container resource requests/limits for app workloads
- `PodDisruptionBudget` resources for app workloads
- `NetworkPolicy` resources for default-deny plus app dependency egress
- `ServiceMonitor` templates for Prometheus scraping

## Verification

```bash
. .venv/bin/activate && ruff check . && python -m pytest -q
docker compose config --quiet
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform >/tmp/campaign-platform-rendered.yaml
docker compose build campaign-api dispatcher
docker compose up --detach --force-recreate campaign-api dispatcher
scripts/local/e2e-smoke-test.sh
```

Latest verified results:

- `50 passed`
- Helm lint: `1 chart(s) linted, 0 chart(s) failed`
- Compose smoke test: `Smoke test passed: 3/3 messages reached terminal status.`

## Follow-up candidates

- Add Grafana dashboard JSON and alert rules for campaign success rate, queue depth, retry rate, and dead-letter rate.
- Add a true delayed retry scheduler instead of immediate retry-subject reprocessing.
- Add OpenTelemetry instrumentation in the app code and route OTLP to the collector.
- Add CI gates for `ruff`, `pytest`, `helm lint`, `helm template`, and Docker builds.
