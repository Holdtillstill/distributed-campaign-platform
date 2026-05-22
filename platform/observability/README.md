# Observability Stack

This directory contains local-first Helm values for the open-source observability stack planned for the distributed campaign platform.

Components:

- Prometheus and Alertmanager via `kube-prometheus-stack`
- Grafana dashboards and data sources
- Loki for application logs
- Tempo for traces
- OpenTelemetry Collector for OTLP ingest and fan-out

The app chart can emit `ServiceMonitor` resources for Campaign API, Provider Simulator, and Dispatcher when the Prometheus Operator CRDs are installed.

## Local install sketch

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
```

## Local access after install

```bash
kubectl -n observability port-forward svc/kube-prometheus-stack-grafana 3000:80
kubectl -n observability port-forward svc/kube-prometheus-stack-prometheus 9090:9090
kubectl -n observability port-forward svc/kube-prometheus-stack-alertmanager 9093:9093
kubectl -n observability port-forward svc/loki-gateway 3100:80
kubectl -n observability port-forward svc/tempo 3200:3200
```

Open:

- Grafana: <http://127.0.0.1:3000> (`admin` / `campaign-local` for local kind only)
- Prometheus: <http://127.0.0.1:9090>
- Alertmanager: <http://127.0.0.1:9093>
- Loki API: <http://127.0.0.1:3100/loki/api/v1/status/buildinfo>
- Tempo readiness: <http://127.0.0.1:3200/ready>

After installing `kube-prometheus-stack`, re-enable the app ServiceMonitors:

```bash
helm upgrade --install campaign-platform deploy/helm/campaign-platform \
  --namespace campaign-platform \
  --set observability.serviceMonitor.enabled=true \
  --set networkPolicy.enabled=false \
  --set campaignApi.service.port=8080
```

Prometheus should then show the app targets as `up`:

- `campaign-platform-campaign-api`
- `campaign-platform-dispatcher`
- `campaign-platform-provider-simulator`

## Essential Grafana dashboards

Load the local dashboard ConfigMap after Grafana is installed:

```bash
scripts/local/install-observability-dashboards.sh
```

This installs two starter dashboards:

- `Campaign Platform Essential Overview`
- `Kubernetes Essential Overview`

Grafana dashboard URLs:

- <http://127.0.0.1:3000/d/campaign-platform-essential/campaign-platform-essential-overview>
- <http://127.0.0.1:3000/d/k8s-essential-overview/kubernetes-essential-overview>

Prometheus v3 redirects `/graph` to the newer query UI. Use:

- <http://127.0.0.1:9090/query>
- <http://127.0.0.1:9090/targets>
