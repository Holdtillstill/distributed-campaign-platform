# LLM Project Evaluation Prompt

Use this prompt when asking another LLM to review and evaluate this repository.

```text
You are a senior/staff platform engineer and hiring-panel reviewer. Please review this repository as a job-portfolio project, not as a real production business. The goal is to judge whether the project demonstrates strong engineering judgment, practical cloud architecture, reliable application logic, and a credible interview story.

Project context:
- Repository: distributed-campaign-platform.
- Local project path: `/Users/user/projects/distributed-campaign-platform`.
- Purpose: distributed SMS/campaign platform demo with broadcast messaging plus inbound MO/MT "chitchat" flows.
- Product story: a consumer sees an ad such as "Send keyword FSummer to shortcode 12345", texts the keyword, receives terms, provides ZIP code for market segmentation, replies Y for double opt-in, and can STOP/HELP. Unknown messages get a polite fallback.
- Local stack: FastAPI campaign API, FastAPI dispatcher, FastAPI provider simulator, React/Vite web UI, PostgreSQL, Redis, NATS JetStream, Docker Compose.
- Cloud target: AWS EKS in a brand-new AWS account. Terraform provisions VPC/subnets/NAT/VPC endpoints/ECR/EKS/SQS-related infrastructure. Helm provides Kubernetes manifests for API, dispatcher, provider simulator, web UI, ingress, HPA, service accounts, External Secrets, Postgres/NATS local chart resources, and EKS overrides.
- Current strategic direction: local/dev defaults to NATS JetStream; the app also has an optional `QUEUE_PROVIDER=sqs` path for AWS SQS. Redis/ElastiCache hot dedupe and RDS PostgreSQL remain production-evolution items. Verify how much of each path is implemented versus documented.
- This is cost-sensitive and portfolio-oriented. Do not recommend enterprise-grade spend unless it materially improves the hiring signal.

Important files and directories to inspect:
- README.md
- apps/campaign-api/app/main.py
- apps/campaign-api/app/db.py
- apps/campaign-api/app/schema.sql
- apps/dispatcher/app/main.py
- apps/provider-simulator/app/main.py
- apps/shared/campaign_common/
- apps/web-ui/src/
- tests/unit/
- scripts/local/e2e-smoke-test.sh
- compose.yaml
- deploy/helm/campaign-platform/
- deploy/helm/campaign-platform/values-eks-dev.yaml
- infra/terraform/environments/dev/
- docs/architecture/architecture.md
- docs/architecture/architecture-diagram.mmd
- docs/architecture/aws-eks-architecture.mmd
- docs/runbooks/eks-dev.md
- docs/runbooks/local-demo.md
- docs/security.md
- docs/cost.md
- platform/argocd/
- platform/external-secrets/

Recent local validation results reported by the maintainer:
- `uv run pytest`: 142 tests passed.
- Live local inbound SMS flow through `POST /public/sms/inbound` passed:
  - `FSummer` -> keyword flow started.
  - `94105` -> ZIP captured and market segment set to `West`.
  - `Y` -> double opt-in subscription confirmed.
  - `STOP` -> subscriber opted out and suppression entry written.
  - Verified 4 inbound messages, 4 outbound replies, subscriber state, consent state, conversation state, and suppression row in local PostgreSQL.
- `scripts/local/e2e-smoke-test.sh` passed after topping up the demo company credit balance:
  - 3-recipient broadcast campaign created.
  - Dispatcher processed all messages.
  - Provider simulator reported 3/3 sent.

Your review goals:
1. Decide whether the project is currently ready to present in interviews.
2. Decide whether it is ready to deploy to EKS, and distinguish "demo deployable" from "production ready".
3. Identify correctness bugs, reliability gaps, scalability risks, security/compliance concerns, cost traps, and documentation mismatches.
4. Evaluate the architecture decisions around queueing, deduplication/idempotency, database load, and local-vs-AWS parity.
5. Judge the product depth of the MO/MT chitchat flow and whether it tells a convincing SMS SaaS/platform story.
6. Judge whether the Terraform/Helm setup is credible for a brand-new AWS account.
7. Recommend the smallest set of changes that would most improve the hiring signal.

Specific questions to answer:
- What are the top blockers before an EKS demo deployment?
- What are the top blockers before claiming production readiness?
- Is SQS + Redis + PostgreSQL the right AWS story for this workload? If not, what would you change?
- Is the local NATS-based implementation acceptable as a local dev stand-in for the AWS SQS direction?
- Does the inbound SMS state machine handle the important edge cases for keyword, ZIP, Y/N, STOP, HELP, and unknown messages?
- Is database load controlled well enough during massive broadcasts, or are there hot paths that should move behind queue/cache/batch boundaries?
- Are idempotency and deduplication implemented clearly enough for both broadcast and inbound provider webhooks?
- Are Kubernetes readiness/liveness, HPA, service accounts, secrets, ingress, and network policies credible?
- Does the AWS network design look appropriate for a new account: VPC, public/private subnets, NAT, route tables, endpoints, EKS node placement, ALB?
- Are observability, runbooks, cost notes, and diagrams good enough for an interviewer to follow?
- What tests should be added next?

Please review by reading the code and docs directly. When making claims, cite concrete file paths and line numbers where possible.

Suggested commands to run if the environment supports them:
- `uv run pytest`
- `uv run ruff check`
- `npm test -- --run` from `apps/web-ui`
- `npm run build` from `apps/web-ui`
- `helm lint deploy/helm/campaign-platform`
- `helm template campaign-platform deploy/helm/campaign-platform -f deploy/helm/campaign-platform/values-eks-dev.yaml`
- `terraform -chdir=infra/terraform/environments/dev validate`
- `docker compose ps`
- `scripts/local/e2e-smoke-test.sh`

Output format:
1. Executive verdict:
   - Interview readiness: Ready / Almost ready / Not ready.
   - EKS demo readiness: Ready / Almost ready / Not ready.
   - Production readiness: Ready / Almost ready / Not ready.
   - One-paragraph rationale.

2. Scorecard table:
   - Architecture
   - Application correctness
   - Scalability/performance
   - Reliability/resilience
   - AWS/EKS readiness
   - Security/compliance
   - Cost control
   - Observability/runbooks
   - Test coverage
   - Portfolio/interview storytelling
   For each: score 1-10, evidence, and main concern.

3. Findings:
   - List issues ordered by severity.
   - Use severities P0, P1, P2, P3.
   - Include file/line evidence.
   - Explain impact and recommended fix.

4. Implementation gap check:
   - Separate what is implemented, what is documented only, and what is missing.
   - Pay special attention to SQS, Redis dedupe, RDS/PostgreSQL, Terraform, Helm, and inbound SMS provider webhook handling.

5. Recommended next work:
   - Top 5 fixes before showing this to interviewers.
   - Top 5 fixes before an EKS demo.
   - Top 5 longer-term production hardening items.

6. Interview narrative:
   - Give 5 concise talking points the project owner should use.
   - Give 5 likely interviewer questions and strong answers.

Be direct and critical, but calibrate expectations to a portfolio project built to help land a job. Prefer practical, high-signal improvements over expensive production theater.
```
