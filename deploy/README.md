# Deploy

Deployment packaging lives here.

- `helm/campaign-platform`: app chart used by kind and EKS.
- `helm/campaign-platform/values.yaml`: local/kind defaults.
- `helm/campaign-platform/values-eks-dev.yaml`: EKS dev overlay with ALB ingress, External Secrets, HPA, and persistent Postgres/NATS storage.
- `cloudfront/static-spa-router.js`: CloudFront Function source for the static portfolio host. It rewrites frontend routes to `index.html` while rejecting `/api/*` and `/r/*` so the static site does not serve the app shell as a fake API response.

The chart defaults to `global.queue.provider=nats` for local and cost-controlled demos. EKS can switch to AWS SQS with `global.queue.provider=sqs` plus the Terraform SQS queue URL outputs and the app service account IRSA role.

The static web UI deploy workflow expects an existing private S3 bucket,
CloudFront distribution, and OIDC role. Set repository variables
`AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `STATIC_SITE_BUCKET`,
`CLOUDFRONT_DISTRIBUTION_ID`, `CLOUDFRONT_FUNCTION_NAME`, and `SITE_URL`, then
run `.github/workflows/static-deploy.yml`. The workflow publishes the
CloudFront Function and associates it with the distribution's viewer-request
event before syncing assets and running the static-host smoke test.

For EKS, render with account-specific ECR repositories:

```bash
helm template campaign-platform deploy/helm/campaign-platform \
  -f deploy/helm/campaign-platform/values-eks-dev.yaml \
  --set campaignApi.image.repository="$ECR_BASE/campaign-api" \
  --set providerSimulator.image.repository="$ECR_BASE/provider-simulator" \
  --set dispatcher.image.repository="$ECR_BASE/dispatcher" \
  --set webUi.image.repository="$ECR_BASE/web-ui"
```
