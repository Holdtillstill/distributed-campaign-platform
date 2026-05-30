# Senior DevOps / SRE / Platform / Cloud Engineer Study Guide

This guide is aimed at refreshing and strengthening hands-on knowledge for senior DevOps, SRE, platform engineering, and AWS cloud engineering interviews.

It intentionally uses the `distributed-campaign-platform` project as the running example so the study does not stay abstract.

## Project Anchor

Current portfolio project:

**Distributed Campaign Delivery Platform on AWS EKS**

One-liner:

> A production-style Kubernetes platform running an event-driven campaign delivery simulator with GitOps, autoscaling, distributed tracing, open-source observability, SLOs, and incident runbooks.

Current local system pieces:

- `campaign-api`
- `dispatcher`
- `provider-simulator`
- PostgreSQL
- Redis
- NATS / NATS JetStream target
- Docker Compose local stack
- structured JSON logs
- smoke test for campaign creation and dispatch

Planned or in-progress platform pieces:

- Helm charts
- kind local Kubernetes deployment
- Argo CD GitOps
- Prometheus / Grafana
- Loki
- Tempo
- OpenTelemetry Collector
- Alertmanager
- EKS with Terraform
- IRSA, ALB Controller, Karpenter, External Secrets, Kyverno

---

## How to Use This Guide

Use this as a build-and-study loop:

1. Study one topic lightly.
2. Apply it to the project.
3. Write down what broke or surprised you.
4. Turn that into an interview story.
5. Repeat.

Do not try to memorize everything before building. The project is the learning mechanism.

Recommended weekly cadence:

- **60% hands-on project work**
- **25% reading / review**
- **15% interview storytelling and notes**

---

# 1. Core Kubernetes Refresh

## What to Know

### Workload primitives

- Pod
- Deployment
- ReplicaSet
- StatefulSet
- DaemonSet
- Job
- CronJob

### Networking

- ClusterIP Service
- NodePort Service
- LoadBalancer Service
- Ingress
- DNS inside the cluster
- NetworkPolicy

### Configuration

- ConfigMap
- Secret
- environment variables
- mounted volumes
- projected service account tokens

### Health and lifecycle

- liveness probe
- readiness probe
- startup probe
- graceful shutdown
- preStop hooks
- terminationGracePeriodSeconds

### Scheduling and resources

- requests and limits
- QoS classes
- node selectors
- taints and tolerations
- affinity and anti-affinity
- PodDisruptionBudget

## Project Examples

Use these examples from the campaign platform:

| Concept | Project Example |
|---|---|
| Deployment | `campaign-api`, `dispatcher`, `provider-simulator` |
| Service | expose API internally in Kubernetes |
| ConfigMap | provider mode, latency, feature flags |
| Secret | database credentials, Redis URL, NATS credentials |
| readinessProbe | API only ready after DB/NATS connectivity works |
| livenessProbe | restart stuck API or dispatcher process |
| HPA | scale dispatcher based on CPU or queue depth |
| PDB | keep at least one API replica available during node drain |
| NetworkPolicy | API can reach DB/NATS; random pods cannot |

## Hands-On Labs

1. Deploy `campaign-api` to kind.
2. Add readiness and liveness probes.
3. Break the DB connection and observe readiness behavior.
4. Add resource requests/limits.
5. Add an HPA and generate load.
6. Add a PDB and simulate node drain behavior.
7. Add NetworkPolicies and verify blocked traffic.

## Interview Questions

- What is the difference between liveness and readiness probes?
- What happens when a pod exceeds its memory limit?
- How does Kubernetes decide where to schedule a pod?
- What is a PodDisruptionBudget and what does it not protect against?
- How would you debug a pod stuck in `CrashLoopBackOff`?
- How would you debug a service that works by pod IP but not by service name?

## Senior-Level Talking Point

> In the campaign platform, I treated Kubernetes configuration as operational design, not just deployment YAML. Each service has probes, resource requests, rollout behavior, and eventually PDBs and NetworkPolicies so failure modes are observable and controlled.

---

# 2. Helm

## What to Know

- chart structure
- `values.yaml`
- templates
- helpers
- release names
- environment-specific values
- `helm lint`
- `helm template`
- `helm upgrade --install`
- chart version vs app version

## Project Examples

Target chart structure:

```text
deploy/helm/campaign-platform/
  Chart.yaml
  values.yaml
  values-local.yaml
  values-dev.yaml
  templates/
    campaign-api-deployment.yaml
    dispatcher-deployment.yaml
    provider-simulator-deployment.yaml
    services.yaml
    configmaps.yaml
    secrets.yaml
    pdbs.yaml
    hpas.yaml
    servicemonitors.yaml
```

Use Helm to parameterize:

- image repository and tag
- replica counts
- resource requests/limits
- provider simulator failure mode
- database/NATS/Redis endpoints
- ingress hostnames
- ServiceMonitor enablement

## Hands-On Labs

1. Convert Compose services to Helm templates.
2. Run `helm lint`.
3. Run `helm template` and inspect generated YAML.
4. Deploy to kind.
5. Override image tags using a values file.
6. Add a `values-dev.yaml` for EKS dev.

## Interview Questions

- Why use Helm instead of raw YAML?
- How do you manage different values per environment?
- How do you prevent Helm charts from becoming unreadable?
- What is the difference between `helm template` and `helm install`?

## Senior-Level Talking Point

> Helm is useful when it captures repeatable deployment intent, but it can become dangerous when it hides complexity. For this project I would keep templates explicit, values well-documented, and validate rendered manifests in CI.

---

# 3. GitOps and Argo CD

## What to Know

- Git as source of truth
- Argo CD Application
- App-of-apps pattern
- sync policy
- manual vs automated sync
- prune and self-heal
- health status
- diffing live vs desired state
- rollback through Git history
- environment promotion

## Project Examples

Possible Argo CD layout:

```text
platform/argocd/
  root-app.yaml
  applications/
    campaign-platform-dev.yaml
    observability-dev.yaml
    policies-dev.yaml
```

Promotion model:

```text
main branch -> local/kind validation
release branch or values update -> dev EKS
future: prod values file -> prod EKS
```

Example GitOps flow:

1. GitHub Actions builds `campaign-api` image.
2. Image is pushed to ECR.
3. Helm values are updated with the new immutable tag.
4. Argo CD detects the diff.
5. Argo CD syncs the deployment.
6. Rollback is done by reverting the Git commit.

## Hands-On Labs

1. Install Argo CD into kind.
2. Create an Application for the Helm chart.
3. Change replica count in Git and observe sync.
4. Break a manifest and observe Argo failure state.
5. Enable self-heal and manually mutate a live object.
6. Practice rollback by reverting a values change.

## Interview Questions

- What is GitOps?
- What does Argo CD do if someone manually changes a live Kubernetes object?
- What are the risks of auto-sync and prune?
- How would you structure GitOps for multiple environments?
- How do secrets work in GitOps?

## Senior-Level Talking Point

> I use GitOps to make deployment state auditable and reproducible. Argo CD is not just a deploy tool; it is a drift detection and operational control plane.

---

# 4. AWS EKS

## What to Know

### EKS basics

- EKS control plane
- managed node groups
- Fargate profiles
- cluster authentication/access entries
- kubeconfig
- ECR image pulls

### AWS integrations

- VPC CNI
- CoreDNS
- kube-proxy
- EBS CSI driver
- AWS Load Balancer Controller
- ExternalDNS
- cert-manager / ACM
- IRSA
- Karpenter

### Networking

- VPC/subnets
- public vs private subnets
- NAT Gateway cost tradeoffs
- security groups
- security groups for pods
- ALB ingress

## Project Examples

Use EKS to host:

- campaign services
- NATS JetStream
- Redis
- PostgreSQL for dev/demo, or RDS later
- Prometheus/Grafana/Loki/Tempo
- Argo CD

Use Terraform for:

```text
infra/terraform/
  environments/dev
  modules/vpc
  modules/eks
  modules/ecr
  modules/iam
```

Important AWS design choices:

- Region: `us-west-2`
- Use Terraform, not manual console setup
- Use IRSA, not static AWS keys
- Use budget alerts and teardown commands
- Avoid expensive always-on infrastructure during early learning

## Hands-On Labs

1. Create ECR repositories with Terraform.
2. Create a minimal EKS cluster with Terraform.
3. Configure `kubectl` access.
4. Install AWS Load Balancer Controller.
5. Deploy the campaign platform Helm chart.
6. Expose the API through ALB ingress.
7. Add IRSA to one component.
8. Tear everything down cleanly.

## Interview Questions

- What is IRSA and why is it better than static AWS keys?
- How does the AWS Load Balancer Controller work?
- How does the VPC CNI assign pod IPs?
- What are common EKS cost traps?
- How do you manage cluster upgrades?
- How would you troubleshoot pods that cannot pull from ECR?

## Senior-Level Talking Point

> My EKS design keeps AWS infrastructure reproducible with Terraform, uses IRSA for workload identity, and separates local validation from cloud deployment to reduce cost and risk.

---

# 5. Open-Source Observability Stack

## What to Know

### Metrics

- Prometheus
- exporters
- scrape configs
- ServiceMonitor / PodMonitor
- Alertmanager
- PromQL basics

### Logs

- structured JSON logs
- Loki
- log labels vs high-cardinality fields
- Grafana log queries

### Traces

- OpenTelemetry SDK
- OpenTelemetry Collector
- Tempo
- trace IDs
- span relationships
- context propagation

### Dashboards

- RED metrics: rate, errors, duration
- USE metrics: utilization, saturation, errors
- business metrics
- SLO dashboards

## Project Examples

For the campaign platform, instrument:

### API metrics

- requests total
- request latency
- campaign creation count
- validation failures

### Dispatcher metrics

- messages consumed
- provider requests
- provider latency
- retries
- failures
- dead-lettered messages

### Queue metrics

- queue depth
- consumer lag
- redelivery count
- unacked messages

### Business metrics

- campaigns created
- messages queued
- messages sent
- messages failed
- retries by provider mode

### Logs

Every service should log:

- service name
- request ID / correlation ID
- campaign ID
- message ID where relevant
- event name
- status transition

### Traces

Trace path:

```text
POST /campaigns
  -> persist campaign
  -> publish message jobs
  -> dispatcher consume
  -> provider simulator call
  -> update message status
```

## Hands-On Labs

1. Add `/metrics` endpoints to services.
2. Scrape them with Prometheus in kind.
3. Build a Grafana dashboard for API latency and message throughput.
4. Add structured logs and query them in Loki.
5. Add OpenTelemetry traces and inspect them in Tempo.
6. Correlate one campaign ID across logs, metrics, and traces.
7. Trigger provider failures and observe dashboard changes.

## Interview Questions

- What is the difference between metrics, logs, and traces?
- What are RED and USE metrics?
- What is high cardinality and why is it dangerous in Prometheus/Loki?
- How would you instrument an async queue-based workflow?
- How do you alert on symptoms instead of causes?
- What dashboards would you build for an API and worker system?

## Senior-Level Talking Point

> The observability stack is designed around user-visible and workflow-visible signals: API latency, dispatch throughput, queue backlog, provider failures, and retry behavior. The goal is to debug a campaign lifecycle from request to final delivery state using metrics, logs, and traces together.

---

# 6. SRE: SLOs, Error Budgets, Alerts, and Runbooks

## What to Know

- SLI
- SLO
- SLA
- error budget
- burn-rate alerting
- paging vs ticket alerts
- incident severity
- runbooks
- postmortems

## Project Example SLOs

### API availability

- SLI: successful non-5xx requests / total requests
- SLO: 99.9% over 30 days

### API latency

- SLI: request duration
- SLO: 95% of campaign creation requests under 300ms

### Dispatch freshness

- SLI: time from campaign creation to terminal message status
- SLO: 99% of messages reach terminal status within 5 minutes in demo workload

### Queue backlog

- SLI: queue depth or oldest message age
- SLO: oldest queued message age below 60 seconds during normal load

## Alert Examples

- high 5xx rate
- p95 latency above threshold
- queue backlog growing
- provider simulator 429/500 spike
- dispatcher crash looping
- no messages consumed for N minutes
- database connection saturation
- Argo CD app degraded
- HPA at max replicas

## Runbook Examples

Create runbooks for:

- Provider outage
- Queue backlog
- Dispatcher crash loop
- Database connection exhaustion
- API high latency
- Argo CD degraded app
- Prometheus target down

Each runbook should include:

```text
Symptoms
Impact
Likely causes
Dashboards to check
Commands to run
Immediate mitigation
Long-term fix
Prevention
```

## Interview Questions

- What is an SLO and how is it different from an SLA?
- How do error budgets influence engineering decisions?
- What makes an alert actionable?
- How would you design alerts for a queue-based async system?
- What should go into a runbook?

## Senior-Level Talking Point

> I avoid alerting on every low-level symptom. For this platform, the most important user-impacting alerts are API availability, dispatch delay, queue backlog, and provider error rate. Infrastructure alerts support those but should not overwhelm responders.

---

# 7. Distributed Systems Concepts

## What to Know

- async processing
- queues and streams
- at-least-once delivery
- exactly-once is usually unrealistic
- idempotency
- retries with backoff and jitter
- dead-letter queues
- backpressure
- rate limiting
- circuit breakers
- eventual consistency
- out-of-order events
- duplicate events

## Project Examples

The campaign platform should demonstrate:

| Concept | Example |
|---|---|
| Fan-out | one campaign becomes many message jobs |
| At-least-once delivery | NATS JetStream redelivers unacked jobs |
| Idempotency | stable message IDs and idempotency keys |
| Retries | retry provider 429 or transient 5xx |
| DLQ | messages that exceed retry budget |
| Backpressure | scheduler slows dispatch when queue/provider is overloaded |
| Rate limiting | dispatcher respects provider quota |
| Eventual consistency | campaign status updates asynchronously |

## Hands-On Labs

1. Switch plain NATS pub/sub to JetStream durable consumers.
2. Stop dispatcher, create campaign, restart dispatcher, verify jobs are not lost.
3. Simulate provider 429 and implement retry with backoff.
4. Add DLQ behavior after max retries.
5. Send duplicate jobs and verify idempotent handling.
6. Add queue backlog dashboard.

## Interview Questions

- What delivery guarantees do queues provide?
- How do you design idempotent consumers?
- Why should retries use jitter?
- How do you prevent retry storms?
- How do you handle poison messages?
- How do you measure consumer lag or backlog?

## Senior-Level Talking Point

> The important reliability question is not whether failures happen, but whether they are bounded, observable, and recoverable. In this project, provider failures should create retries, DLQ events, metrics, alerts, and runbook paths instead of silent message loss.

---

# 8. Security and Platform Guardrails

## What to Know

### Kubernetes security

- RBAC
- service accounts
- Pod Security Standards
- NetworkPolicy
- non-root containers
- read-only root filesystems
- image scanning
- admission policies

### AWS security

- IAM least privilege
- IRSA
- security groups
- private subnets
- AWS Secrets Manager / Parameter Store
- GitHub Actions OIDC

### Policy tools

- Kyverno
- OPA Gatekeeper
- Trivy
- Checkov
- tfsec
- tflint

## Project Examples

Policies to add:

- disallow `latest` image tag
- require resource requests/limits
- require non-root containers
- disallow privileged containers
- restrict hostPath volumes
- require app labels
- require probes for app services

## Hands-On Labs

1. Run Trivy on built images.
2. Run Checkov/tfsec on Terraform.
3. Add Kyverno policy to block privileged pods.
4. Add NetworkPolicy around PostgreSQL/NATS.
5. Use IRSA for AWS permissions instead of static keys.

## Interview Questions

- How would you secure workloads in EKS?
- What is the difference between Kubernetes RBAC and AWS IAM?
- What is IRSA?
- How do you prevent secrets from leaking in GitOps?
- What guardrails would you enforce with admission control?

## Senior-Level Talking Point

> Platform guardrails should prevent classes of mistakes before they reach production. I would combine IaC scanning, image scanning, GitOps review, and admission policies rather than relying on manual discipline.

---

# 9. Terraform and Infrastructure as Code

## What to Know

- providers
- modules
- state
- remote backend
- state locking
- workspaces vs directories
- variables and outputs
- plan/apply workflow
- drift
- imports
- module versioning

## Project Examples

Terraform should manage:

- VPC
- EKS
- ECR
- IAM roles/policies
- S3 backend if needed
- DynamoDB lock table if used
- ALB-related dependencies
- optional Route 53/ACM

Validation commands:

```bash
terraform fmt -recursive
terraform validate
terraform plan
checkov -d infra/terraform
tfsec infra/terraform
tflint
```

## Interview Questions

- How do you structure Terraform for multiple environments?
- How do you manage Terraform state safely?
- What causes drift and how do you handle it?
- How do you review a Terraform plan?
- How do you avoid overly broad IAM policies?

## Senior-Level Talking Point

> Terraform is the source of truth for cloud infrastructure, while Argo CD is the source of truth for Kubernetes workloads. Keeping that boundary clear prevents confusion between cloud provisioning and app deployment.

---

# 10. CI/CD and Release Engineering

## What to Know

- CI vs CD
- image builds
- immutable image tags
- semantic versioning
- artifact promotion
- GitHub Actions OIDC
- test gates
- rollback
- blue/green and canary concepts

## Project Example Pipeline

Possible flow:

```text
Pull request
  -> lint Python
  -> run unit tests
  -> build containers
  -> scan images
  -> helm lint/template
  -> kind smoke test
Merge to main
  -> build/push images to ECR
  -> update Helm values with immutable tag
  -> Argo CD syncs dev
```

## Interview Questions

- How do you design a safe deployment pipeline?
- Why are immutable image tags important?
- What should block a deployment?
- How do you roll back a GitOps deployment?
- How do you handle database migrations?

## Senior-Level Talking Point

> The pipeline should validate the same artifacts that deploy to Kubernetes: images, Helm templates, policies, and smoke tests. A passing unit test alone is not enough for platform confidence.

---

# 11. Debugging Playbooks

## Kubernetes Debugging Commands

```bash
kubectl get pods -A
kubectl describe pod <pod>
kubectl logs <pod> -c <container>
kubectl logs deploy/<deployment>
kubectl get events -A --sort-by=.lastTimestamp
kubectl exec -it <pod> -- sh
kubectl get svc,ingress,endpoints -n <namespace>
kubectl top pods -A
kubectl top nodes
```

## Helm Debugging Commands

```bash
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform -f values-local.yaml
helm list -A
helm history <release> -n <namespace>
helm rollback <release> <revision> -n <namespace>
```

## Argo CD Debugging Commands

```bash
argocd app list
argocd app get <app>
argocd app diff <app>
argocd app sync <app>
argocd app rollback <app> <revision>
```

## Prometheus Debugging Questions

- Is the target up?
- Is the ServiceMonitor selected by Prometheus?
- Are labels correct?
- Is the metric emitted by the app?
- Is the query wrong or the data absent?

## Incident Debugging Flow

1. Define user-visible symptom.
2. Check dashboards.
3. Check recent deploys / Argo CD sync history.
4. Check Kubernetes events.
5. Check logs with correlation IDs.
6. Check traces for slow spans.
7. Mitigate first.
8. Root cause later.

---

# 12. Interview Story Bank

Use the project to create stories like these.

## Story 1: Building a Kubernetes platform

Problem:

> I wanted a production-style platform that demonstrated EKS, GitOps, and observability.

Action:

> Built a distributed campaign delivery simulator, packaged services with Helm, deployed with Argo CD, and planned EKS provisioning with Terraform.

Result:

> Created a realistic platform artifact with service scaling, observability, incident runbooks, and cloud cost guardrails.

## Story 2: Observability for async systems

Problem:

> Async queue-based systems are hard to debug because the user request and background processing happen in different services.

Action:

> Added structured logs, metrics, traces, queue metrics, and correlation IDs across API, dispatcher, provider simulator, and database updates.

Result:

> Could trace a campaign lifecycle from request to dispatch and final status.

## Story 3: Reliability under provider failure

Problem:

> External providers can rate-limit or fail.

Action:

> Simulated provider 429/500 responses, added retries/DLQ targets, tracked failure metrics, and designed backlog alerts/runbooks.

Result:

> Failures became visible, bounded, and recoverable instead of silent.

## Story 4: GitOps deployment control

Problem:

> Manual Kubernetes changes create drift and unclear rollback paths.

Action:

> Used Argo CD with Helm values as the desired state and practiced drift detection, sync, and rollback.

Result:

> Deployment state became auditable and reproducible.

---

# 13. Suggested 8-Week Study Plan

## Week 1: Kubernetes basics using the local app

Focus:

- Pods, Deployments, Services
- ConfigMaps/Secrets
- probes
- resources

Deliverable:

- campaign services deployed to kind

## Week 2: Helm and local Kubernetes polish

Focus:

- Helm chart
- values files
- HPA/PDB
- NetworkPolicy basics

Deliverable:

- reusable Helm chart for local/kind

## Week 3: Distributed reliability

Focus:

- JetStream durable consumers
- retries
- idempotency
- DLQ
- queue metrics

Deliverable:

- dispatcher reliability hardening

## Week 4: Observability foundations

Focus:

- Prometheus
- Grafana
- ServiceMonitor
- app metrics

Deliverable:

- dashboard for API, dispatcher, provider, queue

## Week 5: Logs and traces

Focus:

- Loki
- Tempo
- OpenTelemetry Collector
- correlation IDs

Deliverable:

- trace one campaign lifecycle end-to-end

## Week 6: Argo CD GitOps

Focus:

- Argo CD Applications
- app-of-apps
- sync/diff/rollback

Deliverable:

- GitOps deployment to kind or dev cluster

## Week 7: EKS and AWS platform layer

Focus:

- Terraform EKS
- ECR
- ALB Controller
- IRSA
- Karpenter basics

Deliverable:

- dev EKS deployment, cost-controlled

## Week 8: SRE polish and interview readiness

Focus:

- SLOs
- alerts
- runbooks
- incident simulations
- screenshots
- resume bullets

Deliverable:

- portfolio README, dashboards, runbooks, interview stories

---

# 14. Quick Glossary

- **EKS**: AWS-managed Kubernetes control plane.
- **IRSA**: IAM Roles for Service Accounts; maps Kubernetes service accounts to AWS IAM roles.
- **HPA**: Horizontal Pod Autoscaler; scales pods based on metrics.
- **PDB**: PodDisruptionBudget; limits voluntary disruptions.
- **GitOps**: Managing desired system state through Git.
- **Argo CD**: GitOps controller for Kubernetes.
- **Prometheus**: metrics collection and query system.
- **Grafana**: dashboard and visualization tool.
- **Loki**: log aggregation system optimized for labels.
- **Tempo**: distributed tracing backend.
- **OpenTelemetry**: standard for instrumentation and telemetry pipelines.
- **Alertmanager**: Prometheus alert routing and notification system.
- **SLO**: reliability target based on service-level indicators.
- **Error budget**: allowed unreliability under an SLO.
- **RED metrics**: request rate, errors, duration.
- **USE metrics**: utilization, saturation, errors.
- **DLQ**: dead-letter queue for failed messages.
- **Backpressure**: slowing producers or processing to prevent overload.
- **Idempotency**: safely processing duplicate requests/events without duplicate effects.

---

# 15. What To Build Next For Maximum Learning

Highest-value next steps:

1. Convert local services to Helm.
2. Deploy to kind.
3. Switch from plain NATS pub/sub to JetStream durable consumers.
4. Add `/metrics` endpoints.
5. Install Prometheus/Grafana locally.
6. Build first dashboard.
7. Add one runbook: queue backlog.
8. Add Argo CD deployment.
9. Only then move to EKS.

This sequence keeps cost low and gives strong learning feedback.

---

# 16. Resume Bullet Targets

Once the project is mature, convert it into bullets like:

- Built a production-style AWS EKS platform with Terraform, Helm, Argo CD, IRSA, and GitOps workflows for an event-driven campaign delivery simulator.
- Implemented open-source observability using Prometheus, Grafana, Loki, Tempo, and OpenTelemetry to correlate metrics, logs, and traces across async campaign workflows.
- Designed SLOs, Alertmanager alerts, and incident runbooks for API latency, provider failures, queue backlog, dispatcher crashes, and Kubernetes workload degradation.
- Added Kubernetes platform guardrails including resource requests/limits, readiness/liveness probes, NetworkPolicies, PodDisruptionBudgets, and planned Kyverno admission policies.
- Simulated distributed system failure modes including provider rate limits, transient 5xx errors, duplicate events, retries, and dead-letter handling.

---

# 17. Final Guidance

You are not starting from zero. You already have senior AWS, DevOps, reliability, CI/CD, and production systems experience.

The study goal is to map that existing experience onto modern Kubernetes-native vocabulary and hands-on artifacts:

```text
AWS + Terraform experience
  -> EKS platform provisioning

CI/CD experience
  -> GitOps with Argo CD and Helm

Datadog/observability experience
  -> Prometheus, Grafana, Loki, Tempo, OpenTelemetry

Incident response experience
  -> SLOs, alerts, runbooks, failure simulation

Messaging/high-throughput systems experience
  -> distributed campaign delivery simulator
```

The strongest interview posture is:

> I have production AWS/platform experience, and I built this project to deepen and demonstrate hands-on Kubernetes, EKS, GitOps, and open-source observability skills in a realistic distributed system.
