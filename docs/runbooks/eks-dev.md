# EKS Dev Deployment Runbook

This runbook turns the local/kind demo into an ephemeral AWS EKS deployment.

## 1. Provision AWS

```bash
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and replace cluster_endpoint_public_access_cidrs
# with your VPN, office, or current public IP /32.
terraform init
terraform apply
aws eks update-kubeconfig --region us-west-2 --name campaign-platform-dev
```

Capture the outputs:

```bash
terraform output -json ecr_repository_urls
terraform output -json sqs_queue_urls
terraform output load_balancer_controller_role_arn
terraform output external_secrets_role_arn
terraform output app_role_arn
```

The Terraform environment builds the network from scratch:

- one VPC
- public subnets for ALB and NAT gateways
- private subnets for EKS managed nodes
- dedicated small control-plane subnets for EKS cross-account ENIs
- one NAT gateway by default for cost-controlled demos; set `single_nat_gateway=false` and `one_nat_gateway_per_az=true` for higher availability
- VPC endpoints for common AWS APIs used by nodes, controllers, and SQS traffic
- SQS Standard queues and DLQs for broadcast shards, inbound MO, and outbound MT work
- an app IRSA role with SQS access for the `campaign-platform` service account

The cluster endpoint defaults to public and private access, with public access limited by `cluster_endpoint_public_access_cidrs`.

## 2. Install Cluster Add-Ons

Install AWS Load Balancer Controller using the Terraform `load_balancer_controller_role_arn` output as the service account role annotation.

Install External Secrets Operator using the Terraform `external_secrets_role_arn` output as the service account role annotation, then apply:

```bash
kubectl apply -f platform/external-secrets/cluster-secret-store.yaml
```

Install the observability stack only when you want Prometheus/Grafana/Loki/Tempo in the EKS demo. If Prometheus Operator CRDs are not installed, disable ServiceMonitors when installing the app:

```bash
--set observability.serviceMonitor.enabled=false
```

## 3. Create App Secrets

Store these keys in AWS Secrets Manager or SSM Parameter Store:

- `/campaign-platform/dev/database-url`
- `/campaign-platform/dev/postgres-db`
- `/campaign-platform/dev/postgres-user`
- `/campaign-platform/dev/postgres-password`

For the in-cluster dev Postgres path, `DATABASE_URL` should point at:

```text
postgresql://<user>:<password>@campaign-platform-postgres:5432/<database>
```

## 4. Build And Push Images

```bash
AWS_REGION=us-west-2
AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_BASE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/campaign-platform-dev"

aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

docker build -t "$ECR_BASE/campaign-api:dev" -f apps/campaign-api/Dockerfile .
docker build -t "$ECR_BASE/dispatcher:dev" -f apps/dispatcher/Dockerfile .
docker build -t "$ECR_BASE/provider-simulator:dev" -f apps/provider-simulator/Dockerfile .
docker build -t "$ECR_BASE/web-ui:dev" -f apps/web-ui/Dockerfile .

docker push "$ECR_BASE/campaign-api:dev"
docker push "$ECR_BASE/dispatcher:dev"
docker push "$ECR_BASE/provider-simulator:dev"
docker push "$ECR_BASE/web-ui:dev"
```

## 5. Deploy The App

```bash
APP_ROLE_ARN="$(terraform -chdir=infra/terraform/environments/dev output -raw app_role_arn)"

helm upgrade --install campaign-platform deploy/helm/campaign-platform \
  --namespace campaign-platform \
  --create-namespace \
  -f deploy/helm/campaign-platform/values-eks-dev.yaml \
  --set serviceAccount.annotations."eks\\.amazonaws\\.com/role-arn"="$APP_ROLE_ARN" \
  --set campaignApi.image.repository="$ECR_BASE/campaign-api" \
  --set providerSimulator.image.repository="$ECR_BASE/provider-simulator" \
  --set dispatcher.image.repository="$ECR_BASE/dispatcher" \
  --set webUi.image.repository="$ECR_BASE/web-ui"
```

The chart defaults to `QUEUE_PROVIDER=nats` so the first EKS demo can use the same in-cluster queue path as kind. To prove the AWS-native SQS path, pass the Terraform queue outputs:

```bash
SQS_BROADCAST_QUEUE_URL="$(terraform -chdir=infra/terraform/environments/dev output -json sqs_queue_urls | jq -r .broadcast_shards)"
SQS_BROADCAST_DLQ_URL="$(terraform -chdir=infra/terraform/environments/dev output -json sqs_dead_letter_queue_urls | jq -r .broadcast_shards)"

helm upgrade --install campaign-platform deploy/helm/campaign-platform \
  --namespace campaign-platform \
  --create-namespace \
  -f deploy/helm/campaign-platform/values-eks-dev.yaml \
  --set serviceAccount.annotations."eks\\.amazonaws\\.com/role-arn"="$APP_ROLE_ARN" \
  --set global.queue.provider=sqs \
  --set global.queue.sqs.broadcastQueueUrl="$SQS_BROADCAST_QUEUE_URL" \
  --set global.queue.sqs.deadLetterQueueUrl="$SQS_BROADCAST_DLQ_URL" \
  --set campaignApi.image.repository="$ECR_BASE/campaign-api" \
  --set providerSimulator.image.repository="$ECR_BASE/provider-simulator" \
  --set dispatcher.image.repository="$ECR_BASE/dispatcher" \
  --set webUi.image.repository="$ECR_BASE/web-ui"
```

Watch rollout:

```bash
kubectl -n campaign-platform get pods
kubectl -n campaign-platform get ingress
kubectl -n campaign-platform rollout status deploy/campaign-platform-campaign-api
kubectl -n campaign-platform rollout status deploy/campaign-platform-dispatcher
kubectl -n campaign-platform rollout status deploy/campaign-platform-web-ui
```

## 6. Tear Down

```bash
helm uninstall campaign-platform -n campaign-platform
cd infra/terraform/environments/dev
terraform destroy
```
