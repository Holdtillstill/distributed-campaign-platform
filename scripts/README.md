# Scripts

Bootstrap, validation, local development, and teardown helpers.

- `check-prereqs.sh`: checks local tools before running the demo path.
- `local/e2e-smoke-test.sh`: creates a local campaign and waits for dispatch completion.
- `local/kind-deploy.sh`: builds local images, loads them into kind, installs the Helm chart, and waits for rollout.
- `local/seed-demo-data.py`: seeds the Demo Retail Co tenant, access code, subscribers, content, and campaign data.
- `local/install-observability-dashboards.sh`: imports local Grafana dashboard assets.
- `local/wait-for-local-stack.sh`: waits for local service readiness.
