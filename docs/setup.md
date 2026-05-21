# Setup Checklist

This project is designed to be local-first, then deployed to ephemeral EKS environments.

## Local tools

Required for the first implementation phase:

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

## GitHub setup needed later

- Create GitHub repo: `distributed-campaign-platform`
- Start private; make public after docs/screenshots are curated
- Later configure GitHub Actions OIDC to assume a least-privilege AWS deployment role
- Do not use static AWS access keys in GitHub Secrets unless absolutely necessary

## Cost-control operating rule

Cloud environment should be ephemeral by default:

```bash
make deploy-dev
make demo-load-test
make screenshots
make destroy-dev
```

Until those targets exist, manually run Terraform destroy after every EKS test.
