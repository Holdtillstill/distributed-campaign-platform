# Platform

Kubernetes platform add-ons and GitOps entry points live here.

- `argocd/campaign-platform-app.yaml`: Argo CD Application scaffold for the app chart and EKS values overlay.
- `external-secrets/cluster-secret-store.yaml`: External Secrets Operator `ClusterSecretStore` for AWS Secrets Manager.
- `observability/`: Helm values for Prometheus, Grafana, Loki, Tempo, Alloy, and OpenTelemetry Collector.

The Argo CD manifest intentionally keeps repository and ECR values as `REPLACE_WITH_*` placeholders so account-specific identifiers do not land in source control.
