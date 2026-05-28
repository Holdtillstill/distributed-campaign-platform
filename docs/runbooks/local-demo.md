# Local Demo Runbook

## Prerequisites

- Docker Desktop or equivalent Docker runtime.
- Python virtual environment with project dependencies installed.
- `kubectl`, `helm`, and `kind` for Kubernetes review.
- Node/npm for frontend tests and local builds.

## Docker Compose Demo

Start the local stack:

```bash
docker compose up --build -d
```

Run the end-to-end smoke test:

```bash
scripts/local/e2e-smoke-test.sh
```

Open the app:

- Web UI: <http://127.0.0.1:8080>
- Campaign API: <http://127.0.0.1:8081>
- API docs: <http://127.0.0.1:8080/api/docs>

Stop the stack:

```bash
docker compose down
```

## Seed Demo Retail Co

With PostgreSQL running:

```bash
. .venv/bin/activate
python scripts/local/seed-demo-data.py
```

The script prints the Demo Retail Co company id, customer email, and access code. Keep those values for the customer login flow.

## Internal Admin Flow

1. Open <http://127.0.0.1:8080/internal>.
2. Enter an admin email such as `ops@example.test`.
3. Review the Admin Dashboard.
4. Open Companies.
5. Create or review Demo Retail Co.
6. Copy the active access code for customer onboarding.
7. Open Usage and load the default date range.
8. Use System Status to refresh API, readiness, metrics, and trace-smoke checks.

## Customer Flow

1. Open <http://127.0.0.1:8080/app>.
2. Sign up with the seeded access code or look up memberships by email.
3. Review the company dashboard.
4. Open Subscribers and add lists or imported subscribers.
5. Open Content Library and add media assets.
6. Open Campaigns and create a regular or smart campaign.
7. Review Campaign status, Analytics, Follow-ups, and Settings.

## kind Demo

Deploy to kind:

```bash
scripts/local/kind-deploy.sh
```

Port-forward the app:

```bash
kubectl -n campaign-platform port-forward svc/campaign-platform-web-ui 18080:80
```

Open <http://127.0.0.1:18080>.

Useful checks:

```bash
curl -s http://127.0.0.1:18080/api/healthz
curl -s http://127.0.0.1:18080/api/readyz
curl -s http://127.0.0.1:18080/api/openapi.json | head
curl -s http://127.0.0.1:18080/api/observability/trace-smoke
```

## Logins And Demo Values

- Internal admin: any email on `/internal` in the current demo.
- Customer user: seeded email and access code from `scripts/local/seed-demo-data.py`.
- Grafana local credentials: `admin` / `campaign-local` when using the local observability values.

## Reset

For Compose:

```bash
docker compose down -v
docker compose up --build -d
```

For kind:

```bash
kind delete cluster --name campaign-platform
scripts/local/kind-deploy.sh
```
