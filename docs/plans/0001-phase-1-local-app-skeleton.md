# Phase 1: Local App Skeleton Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build the first local end-to-end distributed campaign flow without AWS resources.

**Architecture:** Docker Compose runs PostgreSQL, Redis, NATS JetStream, Campaign API, Provider Simulator, and one Dispatcher. The Campaign API accepts a campaign request, expands a small synthetic recipient list, publishes message jobs to NATS, the Dispatcher sends to Provider Simulator, and status is persisted in PostgreSQL.

**Tech Stack:** Python 3.12, FastAPI, pytest, PostgreSQL, Redis, NATS JetStream, Docker Compose, OpenTelemetry/logging scaffolding.

---

## Acceptance criteria

- `docker compose up` starts data stores and initial services locally.
- `POST /campaigns` creates a campaign and enqueues messages.
- Dispatcher consumes messages and calls Provider Simulator.
- Provider Simulator can return success, 429, and 500 responses based on config.
- Message status is persisted.
- `GET /campaigns/{id}` returns aggregate status counts.
- Each service exposes `/healthz` and structured JSON logs.
- Unit tests cover idempotency key generation, provider response handling, and status transitions.
- No AWS resources are required.

## Initial tasks

### Task 1: Create Python workspace conventions

**Objective:** Add shared Python packaging/testing conventions for services.

**Files:**
- Create: `pyproject.toml`
- Create: `apps/shared/README.md`
- Create: `apps/shared/campaign_common/__init__.py`
- Create: `apps/shared/campaign_common/models.py`
- Create: `apps/shared/campaign_common/logging.py`
- Create: `apps/shared/campaign_common/idempotency.py`
- Create: `tests/unit/test_idempotency.py`

**Verification:**

```bash
python3 -m pytest tests/unit/test_idempotency.py -v
```

### Task 2: Add local data stores with Docker Compose

**Objective:** Run PostgreSQL, Redis, and NATS JetStream locally.

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `scripts/local/wait-for-local-stack.sh`

**Verification:**

```bash
docker compose up -d postgres redis nats
scripts/local/wait-for-local-stack.sh
```

### Task 3: Build Provider Simulator

**Objective:** Create a mock provider API with configurable latency/failure/rate-limit behavior.

**Files:**
- Create: `apps/provider-simulator/app/main.py`
- Create: `apps/provider-simulator/Dockerfile`
- Create: `apps/provider-simulator/README.md`
- Create: `tests/unit/test_provider_simulator.py`

**Verification:**

```bash
python3 -m pytest tests/unit/test_provider_simulator.py -v
```

### Task 4: Build Campaign API minimal path

**Objective:** Accept campaign creation requests and persist campaign/message rows.

**Files:**
- Create: `apps/campaign-api/app/main.py`
- Create: `apps/campaign-api/app/db.py`
- Create: `apps/campaign-api/app/schema.sql`
- Create: `apps/campaign-api/Dockerfile`
- Create: `tests/unit/test_campaign_status.py`

**Verification:**

```bash
python3 -m pytest tests/unit/test_campaign_status.py -v
```

### Task 5: Add NATS publishing and Dispatcher

**Objective:** Publish message jobs to NATS and consume them in a dispatcher service.

**Files:**
- Modify: `apps/campaign-api/app/main.py`
- Create: `apps/dispatcher/app/main.py`
- Create: `apps/dispatcher/Dockerfile`
- Create: `tests/unit/test_dispatcher_status_transitions.py`

**Verification:**

```bash
python3 -m pytest tests/unit/test_dispatcher_status_transitions.py -v
```

### Task 6: Prove local end-to-end flow

**Objective:** Add a script that creates a campaign and verifies messages reach terminal status.

**Files:**
- Create: `scripts/local/e2e-smoke-test.sh`
- Modify: `README.md`

**Verification:**

```bash
docker compose up --build -d
scripts/local/e2e-smoke-test.sh
```

Expected: campaign created, messages dispatched, and status counts show sent/failed/retried outcomes.
