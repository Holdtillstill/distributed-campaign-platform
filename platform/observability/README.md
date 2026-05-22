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
