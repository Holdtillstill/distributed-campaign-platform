# Observability Runbook

## Scope

This runbook verifies the local open-source observability stack for the SMS SaaS demo: Grafana, Prometheus, Loki, Tempo, Alloy, and the OpenTelemetry Collector.

## Install Or Refresh The Stack

From the repository root:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

kubectl create namespace observability --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace observability \
  -f platform/observability/kube-prometheus-stack-values.yaml

helm upgrade --install loki grafana/loki \
  --namespace observability \
  -f platform/observability/loki-values.yaml

helm upgrade --install tempo grafana/tempo \
  --namespace observability \
  -f platform/observability/tempo-values.yaml

helm upgrade --install otel-collector open-telemetry/opentelemetry-collector \
  --namespace observability \
  -f platform/observability/opentelemetry-collector-values.yaml

helm upgrade --install alloy grafana/alloy \
  --namespace observability \
  -f platform/observability/alloy-values.yaml
```

Deploy or refresh the app chart after the collector exists:

```bash
helm upgrade --install campaign-platform deploy/helm/campaign-platform \
  --namespace campaign-platform \
  --set campaignApi.service.port=8080
```

## Port-Forward

Run these in separate terminals:

```bash
kubectl -n campaign-platform port-forward svc/campaign-platform-web-ui 18080:80
kubectl -n observability port-forward svc/kube-prometheus-stack-grafana 3000:80
kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090:9090
kubectl -n observability port-forward svc/tempo 3200:3200
kubectl -n observability port-forward svc/loki-gateway 3100:80
```

Open:

- App: <http://127.0.0.1:18080>
- API docs: <http://127.0.0.1:18080/api/docs>
- Grafana: <http://127.0.0.1:3000> (`admin` / `campaign-local`)
- Prometheus: <http://127.0.0.1:9090>
- Tempo readiness: <http://127.0.0.1:3200/ready>
- Loki build info: <http://127.0.0.1:3100/loki/api/v1/status/buildinfo>

## Generate API Traffic

Use the trace smoke endpoint first because it does not require database seed data:

```bash
curl -i http://127.0.0.1:18080/api/observability/trace-smoke
```

Expected route: `GET /api/observability/trace-smoke`.

Generate normal app traffic:

```bash
curl -s http://127.0.0.1:18080/api/openapi.json >/tmp/campaign-openapi.json
curl -s http://127.0.0.1:18080/api/admin/dashboard-summary -H 'X-Internal-Admin: true'
curl -s http://127.0.0.1:18080/api/admin/company-health?from=2026-05-22\&to=2026-06-21 -H 'X-Internal-Admin: true'
```

The frontend can also generate traffic:

1. Open <http://127.0.0.1:18080/internal>.
2. Log in as an internal admin.
3. Click Refresh checks in System Status.
4. Open Companies or Usage to call admin APIs.
5. Create a campaign from a customer workspace if seeded data is available.

## Find Traces In Grafana Explore

Normal trace search reads stored traces from Tempo. It does not require generated metrics.

1. Open Grafana at <http://127.0.0.1:3000>.
2. Open Grafana Explore.
3. Select the Tempo data source.
4. Use the Search tab.
5. Set the time range to Last 15 minutes.
6. Search by `service.name`:
   - `campaign-api`
   - `dispatcher`
   - `provider-simulator`
7. For the trace-smoke check, look for a recent `GET /observability/trace-smoke` server span and an `observability.trace_smoke` child span.
8. For campaign dispatch, look for `message.consume` and `provider.send` spans after creating a campaign with NATS/dispatcher enabled.

## Use Explore Traces Breakdown And Rate Views

The Grafana Traces Drilldown or Explore Traces breakdown views are different from
normal trace search. Breakdown and Rate run TraceQL metrics queries such as
`{resource.service.name != nil} | rate() by(resource.service.name)`. Those queries
require Tempo metrics-generator with the `local-blocks` processor registered in
Tempo's generator ring. This stack also enables the `service-graphs` and
`span-metrics` processors and remote-writes generated metrics to the local
Prometheus service.

If the stack was installed before metrics-generator was enabled, refresh
Prometheus first so it accepts remote write, then refresh Tempo:

```bash
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace observability \
  -f platform/observability/kube-prometheus-stack-values.yaml

helm upgrade --install tempo grafana/tempo \
  --namespace observability \
  -f platform/observability/tempo-values.yaml
```

Click path for the breakdown view:

1. Open Grafana at <http://127.0.0.1:3000>.
2. Open Drilldown, then Traces. In older Grafana builds this may be labeled Explore Traces.
3. Select the Tempo data source if Grafana asks.
4. Set the time range to Last 15 minutes.
5. Select All spans.
6. Select Rate.
7. Open the Breakdown tab.
8. Group by the resource attribute `service.name` or `resource.service.name`.

## Check Prometheus Metrics

Open <http://127.0.0.1:9090/targets> and verify app targets are up:

- `campaign-platform-campaign-api`
- `campaign-platform-dispatcher`
- `campaign-platform-provider-simulator`

Useful queries:

```promql
campaign_api_service_info
dispatcher_service_info
provider_simulator_service_info
up
sum by (route, status_code) (rate(campaign_api_http_requests_total[5m]))
histogram_quantile(0.95, sum(rate(campaign_api_http_request_duration_seconds_bucket[5m])) by (le, route))
sum by (status, message_type, audience_mode) (increase(campaign_api_campaigns_created_total[15m]))
sum by (status, message_type) (increase(campaign_api_campaign_messages_total[15m]))
sum by (status, retry, dead_letter) (increase(dispatcher_dispatcher_messages_total[15m]))
histogram_quantile(0.95, sum(rate(dispatcher_dispatcher_message_duration_seconds_bucket[5m])) by (le, status))
sum by (http_status, provider_status) (increase(provider_simulator_provider_requests_total[15m]) or increase(dispatcher_provider_requests_total[15m]))
histogram_quantile(0.95, sum(rate(provider_simulator_provider_request_duration_seconds_bucket[5m])) by (le, provider_status))
histogram_quantile(0.95, sum(rate(dispatcher_provider_request_duration_seconds_bucket[5m])) by (le, provider_status))
sum by (operation) (increase(campaign_api_workflow_exceptions_total[15m]) or increase(dispatcher_workflow_exceptions_total[15m]))
sum by (stream_name, consumer_name) (jetstream_consumer_num_pending{stream_name="CAMPAIGN_MESSAGES"})
sum by (stream_name, consumer_name) (jetstream_consumer_num_ack_pending{stream_name="CAMPAIGN_MESSAGES"})
sum by (stream_name, consumer_name) (jetstream_consumer_num_redelivered{stream_name="CAMPAIGN_MESSAGES"})
```

The app chart also installs PrometheusRule alerts when
`observability.alerts.enabled=true`. Check them in Prometheus:

```promql
ALERTS{alertname=~"Campaign.*"}
```

## Check Logs In Loki

In Grafana Explore, select Loki and query:

```logql
{app_kubernetes_io_component="campaign-api"}
| json
```

Try the same label for `dispatcher` and `provider-simulator`.

Application logs include `trace_id` and `span_id` when a request is inside an
active OpenTelemetry span. Campaign dispatch spans also attach campaign ID,
message ID, retry count, and terminal status attributes so a reviewer can pivot
from a campaign issue to the exact async message path in Tempo.

## Troubleshooting Missing Traces

Check app pods have OTLP configuration:

```bash
kubectl -n campaign-platform exec deploy/campaign-platform-campaign-api -- printenv | grep OTEL
kubectl -n campaign-platform exec deploy/campaign-platform-dispatcher -- printenv | grep OTEL
kubectl -n campaign-platform exec deploy/campaign-platform-provider-simulator -- printenv | grep OTEL
```

Expected key:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-opentelemetry-collector.observability.svc.cluster.local:4317
```

Check collector, Tempo, and app logs:

```bash
kubectl -n observability logs deploy/otel-collector-opentelemetry-collector
kubectl -n observability logs statefulset/tempo
kubectl -n campaign-platform logs deploy/campaign-platform-campaign-api
```

Confirm Tempo is ready:

```bash
curl -i http://127.0.0.1:3200/ready
```

Confirm the collector service exposes OTLP:

```bash
kubectl -n observability get svc otel-collector-opentelemetry-collector -o wide
```

Confirm NetworkPolicy allows observability traffic:

```bash
kubectl -n campaign-platform describe networkpolicy campaign-platform-app-dependencies
```

Look for egress to namespace `observability` on ports `4317` and `4318`, and ingress from namespace `observability` on port `8080`.

For NATS JetStream backlog metrics, also confirm the NATS exporter sidecar and
ServiceMonitor are present:

```bash
kubectl -n campaign-platform get pod -l app.kubernetes.io/component=nats -o jsonpath='{.items[0].spec.containers[*].name}'
kubectl -n campaign-platform get servicemonitor campaign-platform-nats
```

The expected containers are `nats` and `nats-exporter`. Prometheus should show
`jetstream_consumer_num_pending`, `jetstream_consumer_num_ack_pending`, and
`jetstream_consumer_num_redelivered` after a JetStream consumer exists.

If Grafana shows no traces:

- Use the trace smoke route again and widen the Grafana time range to Last 1 hour.
- Search Tempo by `service.name = campaign-api`.
- Make sure you are using the Tempo data source, not Prometheus or Loki.
- Verify `OTEL_TRACES_EXPORTER=otlp` and the `OTEL_EXPORTER_OTLP_ENDPOINT` value.
- Check collector logs for exporter errors to `tempo.observability.svc.cluster.local:4317`.
- Check Tempo logs for rejected batches or readiness failures.
- Avoid testing with `/healthz`, `/readyz`, and `/metrics`; those endpoints are intentionally excluded from FastAPI tracing.

If normal Tempo search works but Explore Traces Breakdown or Rate fails with
`error finding generators: empty ring`, Tempo is answering trace queries but the
metrics-generator is not running or has not registered in the ring. Upgrade Tempo
with `platform/observability/tempo-values.yaml`, then generate fresh traffic and
retry the breakdown view over Last 15 minutes.
