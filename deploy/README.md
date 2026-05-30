# Deploy

Deployment packaging lives here.

- `helm/campaign-platform`: app chart used by kind and EKS.
- `helm/campaign-platform/values.yaml`: local/kind defaults.
- `helm/campaign-platform/values-eks-dev.yaml`: EKS dev overlay with ALB ingress, External Secrets, HPA, and persistent Postgres/NATS storage.

The chart defaults to `global.queue.provider=nats` for local and cost-controlled demos. EKS can switch to AWS SQS with `global.queue.provider=sqs` plus the Terraform SQS queue URL outputs and the app service account IRSA role.

For EKS, render with account-specific ECR repositories:

```bash
helm template campaign-platform deploy/helm/campaign-platform \
  -f deploy/helm/campaign-platform/values-eks-dev.yaml \
  --set campaignApi.image.repository="$ECR_BASE/campaign-api" \
  --set providerSimulator.image.repository="$ECR_BASE/provider-simulator" \
  --set dispatcher.image.repository="$ECR_BASE/dispatcher" \
  --set webUi.image.repository="$ECR_BASE/web-ui"
```
