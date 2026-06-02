# Setup Checklist

This project is designed to be local-first, then deployed to ephemeral EKS environments.

## Local tools

Required for local development and validation:

- git
- Docker Desktop or compatible Docker engine
- Python 3.12+
- kubectl
- Helm
- kind
- jq

Required before AWS/EKS work:

- AWS CLI v2
- Terraform
- eksctl, optional but useful
- argocd CLI, optional but useful
- k9s, optional but useful

Recommended validation/security tools:

- tflint
- checkov
- trivy
- k6
- yq
- pre-commit

## AWS setup needed before EKS deployment

Decide and record locally, not in committed secrets:

- AWS profile name
- AWS account ID
- default AWS region: `us-west-2`
- monthly budget guardrail
- whether a domain/Route 53 hosted zone will be used later

Run:

```bash
aws sts get-caller-identity --profile <profile>
```

Expected: valid account identity JSON.

## Recommended AWS budget alarms

Create AWS Budgets alerts for actual cost thresholds:

- $25
- $50
- $100

## GitHub setup

- Create GitHub repo: `distributed-campaign-platform`
- Start private; make public after docs/screenshots are curated
- Later configure GitHub Actions OIDC to assume a least-privilege AWS deployment role
- Do not use static AWS access keys in GitHub Secrets unless absolutely necessary

## Cost-control operating rule

Cloud environments should be ephemeral by default. Use the EKS runbook for the exact Terraform and Helm flow, and run Terraform destroy after every EKS test unless a longer-lived environment is explicitly approved.

## EKS deployment path

The executable EKS dev flow now lives in [`docs/runbooks/eks-dev.md`](runbooks/eks-dev.md). It provisions AWS with Terraform, builds/pushes ECR images, installs required cluster add-ons, deploys the Helm EKS overlay, and tears everything down afterward.

For a brand-new AWS account, the Terraform dev environment creates the VPC, public subnets, private subnets, dedicated EKS control-plane subnets, NAT, VPC endpoints, ECR repositories, SQS queues, IRSA roles, and EKS cluster from scratch. Dev defaults use one NAT gateway to control cost; set `single_nat_gateway=false` and `one_nat_gateway_per_az=true` when you want the higher-availability network shape. Before apply, replace the example `cluster_endpoint_public_access_cidrs` value with your trusted operator IP range.
