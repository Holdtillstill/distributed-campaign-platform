# Security Design Notes

## Initial controls

- No committed secrets
- `.gitignore` excludes Terraform state, tfvars, kubeconfigs, env files, and keys
- Use fake data only
- Avoid real customer/company names in code and docs
- Use least-privilege IAM for EKS add-ons and workloads
- Use IRSA for AWS access from Kubernetes workloads
- Terraform creates a dedicated app IRSA role for the `campaign-platform` service account when the app uses SQS
- Use Kubernetes RBAC for operational access
- Use NetworkPolicies for default-deny traffic and explicit app/data-plane paths
- Use External Secrets Operator backed by AWS Secrets Manager or SSM Parameter Store for EKS
- Run containers as non-root where possible
- Avoid `latest` image tags
- Require requests/limits for workloads

## Later controls

- Kyverno policies for baseline workload controls
- Trivy image scanning
- Checkov/tflint for IaC validation
- GitHub Actions OIDC to AWS deployment role
- Private EKS endpoint and private nodes as a documented production variant

## Public portfolio caution

Before making the repository public or posting screenshots:

- do not expose account-specific AWS identifiers, ARNs, hosted zone IDs, deployment emails, phone numbers, webhook URLs, or private endpoints
- keep screenshots generic and curated under `docs/screenshots/`
- verify the working tree and git history with secret scanning before publishing
