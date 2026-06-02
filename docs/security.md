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

## Demo authentication boundary

Local review uses simulator identity controls: company access codes, `X-Company-Id` or browser session company ids for tenant selection, and `X-Internal-Admin: true` for internal admin endpoints. These are useful for demonstrating authorization boundaries without adding an external IdP, but they are not production auth. A production path needs signed sessions, tenant-aware RBAC, audited admin roles, webhook signature verification, replay protection, and rate limits on public endpoints.

## CI security posture

GitHub Actions runs dependency, secret, filesystem, image vulnerability, and static-host smoke checks:

- `pip-audit` audits Python dependencies from the uv lock export.
- `npm audit` audits the web UI dependency tree.
- Gitleaks scans repository history and blocks committed cloud identifiers.
- Trivy scans the filesystem for vulnerabilities and secrets.
- Trivy scans Docker images in CI and image-publish paths before any push.
- Trivy misconfiguration scanning is kept advisory because this repo includes local-only demo infrastructure and EKS scaffolding; production promotion would turn unresolved IaC and Kubernetes misconfiguration findings into release blockers.
- GitHub Actions OIDC is used for AWS deploy/publish workflows; no static AWS access keys are required in the repo.
- Scheduled static-host smoke validates CloudFront/API guardrails and browser rendering for selected public routes.

## Later controls

- Kyverno policies for baseline workload controls
- Checkov/tflint for IaC validation
- image signing and provenance verification
- production IdP-backed user sessions, tenant-aware RBAC, and signed webhooks
- Private EKS endpoint and private nodes as a documented production variant

## Public portfolio caution

Before making the repository public or posting screenshots:

- do not expose account-specific AWS identifiers, ARNs, hosted zone IDs, deployment emails, phone numbers, webhook URLs, or private endpoints
- keep screenshots generic and curated under `docs/screenshots/`
- verify the working tree and git history with secret scanning before publishing
