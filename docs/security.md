# Security Design Notes

## Initial controls

- No committed secrets
- `.gitignore` excludes Terraform state, tfvars, kubeconfigs, env files, and keys
- Use fake data only
- Avoid real customer/company names in code and docs
- Use least-privilege IAM for EKS add-ons and workloads
- Use IRSA for AWS access from Kubernetes workloads
- Use Kubernetes RBAC for operational access
- Add NetworkPolicies once namespaces/services stabilize
- Run containers as non-root where possible
- Avoid `latest` image tags
- Require requests/limits for workloads

## Later controls

- External Secrets Operator backed by AWS Secrets Manager or SSM Parameter Store
- Kyverno policies for baseline workload controls
- Trivy image scanning
- Checkov/tflint for IaC validation
- GitHub Actions OIDC to AWS deployment role
- Private EKS endpoint and private nodes as a documented production variant

## Public portfolio caution

Before making the repository public or posting screenshots:

- remove raw AWS account IDs where possible
- avoid exposing email addresses or phone numbers
- verify no secrets are present in git history
- curate screenshots under `docs/screenshots/`
