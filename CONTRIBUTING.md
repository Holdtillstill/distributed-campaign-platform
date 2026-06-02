# Contributing

Thanks for taking a look at CampaignOS. Issues and pull requests are welcome for product bugs, documentation improvements, local runtime behavior, static-host behavior, Helm packaging, observability, and security-safe platform improvements.

## Public Safety

Do not include secrets, AWS account IDs, ARNs, hosted zone IDs, provider credentials, personal data, visitor data, request records, private preview URLs, or deployment internals in issues, pull requests, screenshots, logs, or comments.

Use [SECURITY.md](SECURITY.md) for vulnerabilities or anything that may expose private infrastructure, provider credentials, or sensitive data.

## Validation

Before opening a pull request, run the checks that match your change:

```bash
node scripts/check-public-readiness.mjs
node scripts/verify-workflows.mjs
```

For API, worker, frontend, Helm, image, observability, or deployment changes, run the relevant tests and smokes described in the README.

Runtime preview resources must stay approved, temporary, and cleaned up after validation.
