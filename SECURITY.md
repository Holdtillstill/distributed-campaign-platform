# Security Policy

This project is a public portfolio application. Do not commit AWS account IDs, ARNs, hosted zone IDs, personal emails, provider credentials, tokens, webhook URLs, or private deployment identifiers.

## Reporting

Use GitHub private vulnerability reporting or a direct owner channel. Do not open a public issue that contains secrets, cloud identifiers, visitor data, provider credentials, or deployment internals.

## Scope

- CampaignOS API, dispatcher, provider simulator, and static web UI.
- Container images and the optional EKS deployment path.
- Public CI/CD workflows, dependency audits, secret scans, filesystem scans, and image scans.
- Architecture, observability, and runbook documentation.

## Baseline Checks

CI runs Python and npm dependency audits, Gitleaks secret scanning, Trivy filesystem scanning, and Trivy image scanning for service images. GitHub dependency review runs on public pull requests where the repository security features support it.
