# Phase 0 Repo Foundation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Establish the repository foundation, architecture narrative, setup checklist, and initial project guardrails before implementing application or AWS resources.

**Architecture:** Local-first portfolio project with clear separation between app code, Helm/Kubernetes deployment assets, Terraform infrastructure, platform add-ons, docs, tests, and scripts.

**Tech Stack:** Markdown, Git, Terraform later, Helm later, Python/FastAPI later, AWS EKS later.

---

### Task 1: Create repository skeleton

**Objective:** Create the top-level folders and basic metadata files.

**Files:**
- Create: `README.md`
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `LICENSE`
- Create folders: `apps/`, `deploy/`, `docs/`, `infra/`, `platform/`, `scripts/`, `tests/`

**Verification:**

Run:

```bash
git status --short
```

Expected: new files are listed and no generated secrets/state files are present.

### Task 2: Add architecture docs

**Objective:** Document the system concept, scope, and initial technology choices.

**Files:**
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/decisions/0001-project-scope.md`
- Create: `docs/architecture/decisions/0002-technology-choices.md`

**Verification:**

Run:

```bash
find docs/architecture -type f | sort
```

Expected: overview and ADR files exist.

### Task 3: Add cost and security guardrails

**Objective:** Capture cost estimates, budget guardrails, and public portfolio safety constraints before deploying cloud resources.

**Files:**
- Create: `docs/cost.md`
- Create: `docs/security.md`
- Create: `docs/setup.md`

**Verification:**

Run:

```bash
grep -R "AWS Budgets" docs/cost.md docs/setup.md
```

Expected: budget alert guidance is present.

### Task 4: Add future operational docs placeholders

**Objective:** Add placeholder indexes for runbooks and incident scenarios.

**Files:**
- Create: `docs/runbooks/README.md`
- Create: `docs/incidents/README.md`

**Verification:**

Run:

```bash
find docs/runbooks docs/incidents -type f | sort
```

Expected: both README files exist.

### Task 5: Initialize git repository and first commit

**Objective:** Commit Phase 0 foundation.

**Commands:**

```bash
git init
git add .
git commit -m "docs: add project foundation"
```

**Verification:**

Run:

```bash
git log --oneline -1
```

Expected: latest commit is `docs: add project foundation`.
