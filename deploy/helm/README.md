# Helm

## Campaign Platform Chart

`campaign-platform` deploys the web UI, Campaign API, dispatcher, provider simulator, Postgres, Redis, NATS JetStream, NetworkPolicies, PDBs, optional ServiceMonitors, optional HPAs, and optional ALB ingress.

Local/kind render:

```bash
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform
```

EKS dev render:

```bash
helm template campaign-platform deploy/helm/campaign-platform \
  -f deploy/helm/campaign-platform/values-eks-dev.yaml \
  --set campaignApi.image.repository="$ECR_BASE/campaign-api" \
  --set providerSimulator.image.repository="$ECR_BASE/provider-simulator" \
  --set dispatcher.image.repository="$ECR_BASE/dispatcher" \
  --set webUi.image.repository="$ECR_BASE/web-ui"
```

`values-eks-dev.yaml` expects AWS Load Balancer Controller, External Secrets Operator, and the EBS CSI driver to exist in the cluster.

Queue mode defaults to local-friendly NATS:

```bash
--set global.queue.provider=nats
```

To exercise AWS SQS in EKS, annotate the app service account with the Terraform `app_role_arn` output and set:

```bash
--set global.queue.provider=sqs \
--set global.queue.sqs.broadcastQueueUrl="$SQS_BROADCAST_QUEUE_URL" \
--set global.queue.sqs.deadLetterQueueUrl="$SQS_BROADCAST_DLQ_URL"
```
