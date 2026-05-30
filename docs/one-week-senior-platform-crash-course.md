# One-Week Senior DevOps / SRE / Platform / Cloud Engineer Crash Course

**Purpose:** compress Kubernetes, EKS, Argo CD, observability, SRE, and platform engineering knowledge into one intense week using the `distributed-campaign-platform` project as the concrete anchor.

This is not a checklist-only guide. It is written as learning material: mental models, explanations, project examples, practical labs, and interview language.

## Your Situation

You are not trying to become a beginner DevOps engineer in a week. You already have senior AWS/DevOps/reliability experience. The goal is different:

> Translate your existing AWS, CI/CD, reliability, infrastructure, and incident-response experience into Kubernetes-native, EKS-native, GitOps-native, and open-source-observability vocabulary.

That means we prioritize:

1. concepts that frequently appear in senior interviews,
2. hands-on things you can demonstrate in the project,
3. the ability to explain tradeoffs clearly,
4. debugging workflows,
5. credible senior-level stories.

We deprioritize:

- memorizing every Kubernetes object,
- building a perfect EKS production platform from scratch,
- deep PromQL mastery,
- multi-region Kubernetes,
- service mesh,
- custom operators,
- obscure exam trivia.

---

# The One-Week Plan

Each day has three parts:

1. **Learn** — read the material in this guide.
2. **Build/inspect** — apply the concept to the campaign platform.
3. **Explain** — practice the interview story out loud.

If time is short, prioritize the **must-know** sections and the **explain** sections. Senior interviews often reward clear reasoning more than perfect syntax memory.

## Daily Focus

| Day | Focus | Outcome |
|---|---|---|
| Day 1 | Kubernetes mental model and workload debugging | You can explain pods, deployments, services, probes, resources, and failure debugging |
| Day 2 | Helm and Kubernetes app packaging | You can explain how Compose-style services become reusable Kubernetes deployments |
| Day 3 | EKS and AWS platform layer | You can explain EKS networking, IRSA, ALB, nodes, ECR, and cost tradeoffs |
| Day 4 | GitOps with Argo CD | You can explain desired state, sync, drift, rollback, and promotion |
| Day 5 | Observability: metrics, logs, traces | You can explain Prometheus/Grafana/Loki/Tempo/OTel using the project lifecycle |
| Day 6 | SRE and distributed systems reliability | You can explain SLOs, error budgets, queues, retries, DLQ, idempotency, and backpressure |
| Day 7 | Mock interviews, incident scenarios, and story polish | You can answer senior-level questions using the project as evidence |

---

# Day 1 — Kubernetes Core: How to Think About the Cluster

## The Mental Model

Kubernetes is not just a container runner. Think of it as a reconciliation system.

You declare the desired state:

```text
I want 3 replicas of campaign-api running this image, with these resources, these environment variables, these probes, and this service endpoint.
```

Kubernetes controllers continuously compare desired state against actual state and try to close the gap.

If a pod dies, Kubernetes notices actual state is short one pod and creates another. If a node disappears, Kubernetes reschedules affected pods elsewhere if possible. If a deployment is updated, Kubernetes creates a new ReplicaSet and gradually moves traffic to new pods.

This reconciliation idea matters because senior Kubernetes debugging usually asks:

> Which controller is responsible for this object, and why is actual state not matching desired state?

For example:

- Deployment wants 3 pods but only 1 exists: look at ReplicaSet events, scheduling, image pulls, resource constraints.
- Service exists but traffic fails: look at selectors, endpoints, readiness, DNS, NetworkPolicy.
- HPA exists but does not scale: look at metrics-server, resource requests, HPA events, metric availability.

## Pods Are Disposable; Controllers Are Durable Intent

A pod is the smallest schedulable unit, but you rarely manage pods directly. A pod is cattle, not pet. The durable object is usually the Deployment, StatefulSet, DaemonSet, Job, or CronJob.

In the campaign platform:

- `campaign-api` should be a Deployment because it is stateless HTTP application logic.
- `dispatcher` should also be a Deployment because multiple workers can consume jobs.
- `provider-simulator` should be a Deployment because it is a stateless mock external provider.
- PostgreSQL would normally be a StatefulSet if run in-cluster, though for production you might prefer RDS.
- NATS JetStream may be a StatefulSet because durable stream data needs stable identity/storage.

Interview phrasing:

> For stateless services like the campaign API and dispatcher, I would use Deployments. For systems that need stable network identity or persistent volumes, such as in-cluster NATS JetStream or PostgreSQL in a demo environment, I would use StatefulSets. In real production on AWS I would strongly consider managed data services where appropriate.

## Deployment, ReplicaSet, and Rollout

A Deployment manages ReplicaSets. A ReplicaSet manages pods. When you update a Deployment image, Kubernetes creates a new ReplicaSet and scales it up while scaling the old one down.

Important rollout knobs:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

For an API service, `maxUnavailable: 0` means Kubernetes should avoid reducing available capacity during rollout. For a small demo, this is useful. For large systems, you tune based on capacity and speed.

The senior point is that rollout strategy must match service criticality and capacity. A single-replica API with no readiness probe is not a production-grade rollout. Kubernetes might send traffic to a container before it can handle requests.

## Services and Endpoints

A Kubernetes Service gives stable networking for ephemeral pods. Pods come and go; Services remain.

The Service selects pods using labels:

```yaml
selector:
  app.kubernetes.io/name: campaign-api
```

If the selector does not match pod labels, the Service has no endpoints. This is one of the most common Kubernetes bugs.

Debugging flow:

```bash
kubectl get svc -n campaign-platform
kubectl get endpoints -n campaign-platform
kubectl describe svc campaign-api -n campaign-platform
kubectl get pods -n campaign-platform --show-labels
```

If Service has no endpoints, check:

1. Do pod labels match the Service selector?
2. Are pods Ready?
3. Are readiness probes failing?
4. Is the Service in the right namespace?

## Probes: Liveness, Readiness, Startup

This is a major interview topic.

### Readiness probe

Readiness answers:

> Should this pod receive traffic right now?

A pod can be alive but not ready. For example, `campaign-api` may be running but unable to connect to PostgreSQL or NATS. In that case, Kubernetes should not route traffic to it.

### Liveness probe

Liveness answers:

> Is this container stuck badly enough that Kubernetes should restart it?

A liveness probe should not fail just because a downstream dependency is unavailable. If the database is down, restarting every API pod usually makes the incident worse.

### Startup probe

Startup answers:

> Is this slow-starting app still booting?

It prevents the liveness probe from killing an app that simply takes longer to initialize.

Project example:

- `GET /healthz` can be a simple liveness check: process is running.
- `GET /readyz` should verify required dependencies: DB connection, maybe NATS connection.
- `GET /metrics` exposes Prometheus metrics.

Good interview answer:

> I separate liveness from readiness. Liveness checks whether the process is healthy enough to keep running. Readiness checks whether the service should receive traffic. Dependency failures usually belong in readiness, not liveness, otherwise Kubernetes restarts healthy processes during downstream outages.

## Requests, Limits, and QoS

Resource requests tell Kubernetes what a pod needs to schedule. Limits tell the runtime the maximum a container can use.

- CPU request: scheduling guarantee.
- CPU limit: throttling boundary.
- Memory request: scheduling guarantee.
- Memory limit: OOM kill boundary.

QoS classes:

- **Guaranteed**: requests equal limits for all containers.
- **Burstable**: requests set but not equal to limits.
- **BestEffort**: no requests/limits.

For most app services, Burstable is normal.

Project example:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

Senior nuance:

- CPU limits can cause throttling and latency problems.
- Memory limits are important because exceeding memory kills the container.
- Requests are essential for scheduling and autoscaling.
- HPA CPU scaling depends on CPU requests.

Interview phrasing:

> I always set resource requests because scheduling and HPA behavior depend on them. I am careful with CPU limits because aggressive CPU limits can create throttling and latency spikes. For memory, limits are useful because memory is not compressible; exceeding the limit results in OOM kills.

## Day 1 Lab

Use the project as the example even if not all Kubernetes manifests exist yet.

Goal: be able to explain how each Compose service maps to Kubernetes.

Create this mapping in your notes:

```text
Compose service: campaign-api
Kubernetes: Deployment + Service + ConfigMap + Secret + probes + resources

Compose service: dispatcher
Kubernetes: Deployment + ConfigMap + Secret + probes + resources + HPA

Compose service: provider-simulator
Kubernetes: Deployment + Service + ConfigMap + probes + resources

Compose service: postgres
Kubernetes local/demo: StatefulSet + PVC + Secret
Production AWS option: RDS

Compose service: nats
Kubernetes: StatefulSet or Helm chart-managed NATS cluster
```

Practice explaining this without looking.

---

# Day 2 — Helm: Turning App Intent Into Reusable Kubernetes Configuration

## The Mental Model

Raw Kubernetes YAML is explicit but repetitive. Helm packages a set of Kubernetes manifests into a chart and lets you parameterize environment-specific values.

A Helm chart should answer:

> What objects are needed to run this application, and which parts vary by environment?

For the campaign platform, the objects are Deployments, Services, ConfigMaps, Secrets, HPAs, PDBs, NetworkPolicies, and ServiceMonitors.

The environment-specific parts are image tags, replica counts, hostnames, resource sizes, provider failure mode, and whether observability resources are enabled.

## Helm Is Not Magic

Helm renders templates into normal Kubernetes YAML. That means a good debugging habit is:

```bash
helm template campaign-platform deploy/helm/campaign-platform -f values-local.yaml
```

Read the output. If the rendered YAML is bad, Kubernetes will not save you.

Then:

```bash
helm lint deploy/helm/campaign-platform
```

And for server validation:

```bash
kubectl apply --dry-run=server -f rendered.yaml
```

## Chart Anatomy

A typical chart:

```text
Chart.yaml          # chart metadata
values.yaml         # default values
templates/          # YAML templates
_helpers.tpl        # naming/label helpers
```

Senior-level Helm is less about fancy templating and more about maintainability. Bad Helm charts become unreadable because everything is conditional and nested. Good charts use a small number of values, consistent labels, helper templates, and environment-specific values files.

## Project Example: What Should Be Values?

Good values:

```yaml
campaignApi:
  image:
    repository: campaign-api
    tag: local
  replicas: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
  env:
    logLevel: info

providerSimulator:
  mode: success
  latencyMs: 50
```

Bad values:

```yaml
everything:
  arbitraryYamlBlob: ...
```

If a values file becomes a second programming language, the chart is too clever.

## Helm and GitOps

In a GitOps setup, Helm values become deployment configuration stored in Git. Argo CD can render the chart and compare desired rendered manifests against live cluster state.

A common pattern:

```text
values.yaml          # base defaults
values-local.yaml    # kind/local
values-dev.yaml      # EKS dev
values-prod.yaml     # future production
```

For the project:

- local: images may be loaded into kind, persistence minimal.
- dev EKS: images from ECR, ALB ingress enabled, observability enabled.
- prod: higher replicas, stricter PDBs, production-grade secret management.

## Day 2 Lab

Mentally design the Helm chart for the project:

```text
deploy/helm/campaign-platform/
  Chart.yaml
  values.yaml
  values-local.yaml
  templates/
    _helpers.tpl
    campaign-api-deployment.yaml
    campaign-api-service.yaml
    dispatcher-deployment.yaml
    provider-simulator-deployment.yaml
    configmap.yaml
    secret.yaml
    serviceaccount.yaml
    pdb.yaml
    hpa.yaml
```

Practice this explanation:

> I use Helm to package the campaign platform as a reusable Kubernetes application. The chart defines stable deployment structure, while values files capture environment-specific differences such as image tags, replica counts, resources, ingress settings, and observability integration.

---

# Day 3 — EKS: Kubernetes Meets AWS

## The Mental Model

EKS is Kubernetes control plane management plus AWS integrations.

AWS manages the Kubernetes API server/control plane. You manage worker compute, networking, add-ons, IAM, observability, upgrades, and application deployment.

Do not explain EKS as simply “Kubernetes on AWS.” A senior explanation should mention:

- control plane vs worker nodes,
- VPC networking,
- IAM integration,
- load balancer integration,
- storage integration,
- autoscaling,
- operational cost.

## EKS Components You Must Know

### Control plane

AWS runs the Kubernetes API server and etcd. You pay for the cluster control plane hourly. In many regions this is roughly the classic ~$72/month order of magnitude for one always-on cluster, though exact pricing should be checked.

### Worker nodes

Your pods run on EC2 nodes, managed node groups, self-managed nodes, Karpenter-provisioned nodes, or Fargate.

For this project:

- start with a small managed node group or Karpenter later,
- keep node count low,
- use teardown aggressively.

### VPC CNI

The AWS VPC CNI gives pods IPs from the VPC. This is different from overlay networks used by some other Kubernetes distributions.

Practical implications:

- pod density depends on instance type/IP limits,
- pods can participate directly in VPC networking,
- subnet IP exhaustion is a real issue,
- security groups for pods are possible for advanced cases.

### AWS Load Balancer Controller

This controller watches Kubernetes Ingress or Service resources and creates AWS load balancers.

For the campaign platform:

```text
Ingress -> AWS Load Balancer Controller -> ALB -> campaign-api Service -> campaign-api pods
```

Senior point:

> Kubernetes Ingress is desired state. The AWS Load Balancer Controller reconciles that desired state into AWS ALB resources.

### EBS CSI Driver

Lets Kubernetes dynamically provision EBS volumes for PersistentVolumeClaims.

Relevant for:

- PostgreSQL in demo EKS,
- NATS JetStream persistence,
- Prometheus storage,
- Grafana persistence.

Production caveat:

> For production databases, I would usually prefer managed services like RDS unless there is a strong reason to run the database in Kubernetes.

### IRSA

IRSA means IAM Roles for Service Accounts.

The problem:

- You do not want static AWS keys in Kubernetes Secrets.
- You do not want every pod inheriting the node instance role.

IRSA solution:

- Kubernetes service account is associated with an IAM role.
- AWS SDK in the pod obtains temporary credentials through projected tokens and STS.
- Permissions are scoped per workload.

Project examples:

- External Secrets Operator reads Secrets Manager using IRSA.
- App service writes to S3 using IRSA if needed.
- AWS Load Balancer Controller uses IRSA to manage ALBs.

Interview phrasing:

> IRSA gives pod-level AWS identity. It avoids static credentials and avoids overusing the node role. I would use it for controllers and workloads that need AWS API access.

## EKS Cost Traps

For your project, know this cold. It sounds senior.

Common EKS cost traps:

- leaving EKS control plane running,
- NAT Gateways in multiple AZs,
- ALBs left behind,
- overprovisioned nodes,
- EBS volumes not deleted,
- CloudWatch logs growing,
- Prometheus/Loki retention too high,
- data transfer surprises.

Project guardrails:

- use `us-west-2`,
- budget alerts at $25/$50/$100 already created,
- local-first development with kind,
- teardown docs,
- small node groups,
- avoid NAT-heavy design early,
- keep retention low in demo.

## Day 3 Lab

Draw this from memory:

```text
Developer pushes code
  -> GitHub Actions builds image
  -> image pushed to ECR
  -> Helm values updated
  -> Argo CD syncs to EKS
  -> Deployment creates pods on EC2 nodes
  -> Service routes to pods
  -> Ingress creates ALB via AWS Load Balancer Controller
  -> IRSA gives AWS permissions to specific service accounts
  -> Prometheus scrapes metrics
```

Practice answer:

> EKS gives me the managed Kubernetes control plane, but the platform engineering work is in everything around it: Terraform provisioning, IAM/IRSA, VPC/subnet design, node provisioning, ingress, storage, GitOps, observability, and cost controls.

---

# Day 4 — Argo CD and GitOps

## The Mental Model

GitOps means Git is the source of truth for desired state. The cluster should converge to what Git says.

Argo CD is a Kubernetes controller that compares:

```text
Git desired state vs live cluster state
```

Then reports:

- Synced or OutOfSync
- Healthy or Degraded

And optionally applies changes.

## Why Senior Engineers Care

GitOps is not just a deployment style. It solves operational problems:

- auditability: what changed, who changed it, when,
- rollback: revert Git commit,
- drift detection: live cluster changed manually,
- environment consistency,
- safer promotion workflows.

## Sync, Prune, Self-Heal

### Sync

Apply desired manifests from Git to the cluster.

### Prune

Delete live objects that are no longer in Git.

Powerful but risky. If configured carelessly, prune can delete things you did not intend.

### Self-heal

If someone manually changes a live object, Argo can revert it back to Git desired state.

Good interview nuance:

> I like self-heal for controlled environments, but I am careful with auto-prune and production auto-sync. The right policy depends on blast radius, maturity, and review gates.

## Project GitOps Flow

The campaign platform GitOps flow can be:

1. Code changes merged.
2. CI builds and tests images.
3. Images pushed to ECR with immutable tags.
4. Helm values updated with tag.
5. Argo CD detects diff.
6. Argo syncs application.
7. Observability confirms rollout health.
8. Rollback is a Git revert.

The key senior concept is separation of concerns:

```text
Terraform provisions cloud/platform infrastructure.
Argo CD deploys Kubernetes workloads and platform add-ons.
```

Do not use Terraform to manage every application Deployment if you are using GitOps. Terraform is great for EKS, IAM, VPC, ECR. Argo CD is better for ongoing Kubernetes application reconciliation.

## Day 4 Lab

Practice this answer:

> If a deployment goes bad under GitOps, I first check Argo CD app health and recent sync history. If the bad state came from Git, I revert the commit or roll back the value change. If the live cluster differs from Git, Argo shows drift. I avoid manually patching live objects except as an emergency mitigation, and then I reconcile the desired state in Git.

---

# Day 5 — Observability: Metrics, Logs, and Traces

## The Mental Model

Observability is not “install Grafana.” Observability is the ability to answer questions about system behavior using emitted signals.

The three common signal types:

- **Metrics**: numeric time series. Good for trends, dashboards, alerts.
- **Logs**: discrete events. Good for detail and forensic context.
- **Traces**: request/workflow path across services. Good for latency and distributed flow.

Senior engineers know when to use each.

If the question is “is error rate increasing?” use metrics.

If the question is “what happened to campaign `abc123`?” use logs.

If the question is “where did this request spend time across services?” use traces.

## Prometheus and Metrics

Prometheus scrapes HTTP endpoints, usually `/metrics`, on targets. It stores time series and lets you query them using PromQL.

For the campaign platform, useful metrics are not just CPU/memory. You need app and business workflow metrics:

```text
campaigns_created_total
messages_queued_total
messages_dispatched_total
messages_failed_total
provider_requests_total
provider_request_duration_seconds
provider_rate_limited_total
queue_depth
oldest_queued_message_age_seconds
```

Why this matters:

> Kubernetes metrics tell you whether the platform is healthy. Application metrics tell you whether the business workflow is healthy.

A cluster can have healthy CPU and memory while campaigns are stuck in queue. That is why app metrics matter.

## RED and USE Metrics

### RED for request-driven services

- Rate: how many requests?
- Errors: how many failed?
- Duration: how long did they take?

For `campaign-api`:

- request rate,
- 5xx rate,
- p95 request latency.

### USE for resources

- Utilization: how busy is it?
- Saturation: how much work is waiting?
- Errors: is it failing?

For worker/queue systems:

- dispatcher CPU utilization,
- queue depth / oldest message age as saturation,
- provider errors / retry count.

## Loki and Logs

Loki stores logs and indexes labels. The trap is high cardinality.

Good Loki labels:

```text
service=campaign-api
environment=dev
namespace=campaign-platform
```

Bad Loki labels:

```text
campaign_id=unique-id-per-campaign
message_id=unique-id-per-message
```

Put high-cardinality identifiers in log fields, not labels.

Good structured log:

```json
{
  "service": "dispatcher",
  "event": "provider_request_completed",
  "campaign_id": "cmp_123",
  "message_id": "msg_456",
  "provider_status": 202,
  "duration_ms": 83,
  "level": "info"
}
```

Interview phrasing:

> In Loki, I keep labels low-cardinality and put request IDs, campaign IDs, and message IDs in the log body. That keeps queries useful without exploding index cardinality.

## Tempo and Traces

Traces show a workflow across services.

For the campaign platform, a trace might look like:

```text
POST /campaigns
  span: validate request
  span: insert campaign row
  span: insert message rows
  span: publish NATS jobs
  async continuation:
    span: dispatcher consume job
    span: call provider simulator
    span: update message status
```

Async traces are harder than synchronous HTTP traces because context must be propagated through message metadata. That is actually a strong interview topic.

Senior phrasing:

> For async systems, I propagate trace context and correlation IDs through message headers. That lets me connect the initial campaign request to downstream dispatcher and provider activity even though the work happens later.

## OpenTelemetry Collector

The OTel Collector is a telemetry pipeline. Apps send traces/metrics/logs to it, and it exports to backends like Prometheus, Tempo, or Loki-compatible systems.

Basic mental model:

```text
App instrumentation -> OTel Collector receiver -> processors -> exporters -> backend
```

Processors can batch, enrich, filter, or sample telemetry.

## Day 5 Lab

Trace one lifecycle conceptually:

```text
Create campaign
  -> campaign-api logs campaign_created
  -> metric campaigns_created_total increments
  -> campaign-api publishes NATS messages
  -> dispatcher consumes messages
  -> dispatcher logs status transitions
  -> provider simulator logs provider response
  -> dispatcher updates DB
  -> campaign status endpoint shows terminal counts
```

Practice this answer:

> My observability design would let me debug a campaign by moving between metrics, logs, and traces. Metrics show that dispatch latency or error rate is abnormal. Logs let me inspect a specific campaign or message. Traces show where time was spent across API, queue publishing, dispatch, and provider calls.

---

# Day 6 — SRE and Distributed Reliability

## SLOs: The Core SRE Idea

An SLO is a reliability target for a service. It should be based on what users experience.

For the campaign platform, users care about:

- Can I create campaigns?
- Are messages dispatched in a reasonable time?
- Can I see status accurately?

They do not directly care whether one pod restarted unless that affects the workflow.

## SLI, SLO, SLA

- **SLI**: measurement. Example: percentage of successful campaign creation requests.
- **SLO**: target. Example: 99.9% successful over 30 days.
- **SLA**: contractual promise, usually with penalties.

Interview phrasing:

> SLIs are the measurements, SLOs are internal reliability targets, and SLAs are external contractual commitments. I prefer to alert on SLO symptoms where possible instead of paging on every low-level infrastructure signal.

## Error Budgets

If your SLO is 99.9%, your error budget is 0.1% unreliability for that window.

Error budgets turn reliability into an engineering tradeoff:

- If budget is healthy, you can ship faster.
- If budget is burning too fast, slow risky changes and focus reliability.

## Alerting Philosophy

Bad alert:

> CPU above 80% for 2 minutes.

Maybe useful, but not always user-impacting.

Better alert:

> Campaign creation 5xx rate above threshold or dispatch delay above SLO.

Infrastructure alerts should support diagnosis, not drown responders.

For the campaign platform, primary alerts:

```text
API high 5xx rate
API p95 latency high
oldest queued message age too high
dispatcher consuming zero messages while backlog exists
provider 429/500 spike
Argo CD app degraded
Prometheus target down
```

## Distributed Systems: At-Least-Once and Idempotency

Most queues are at-least-once. That means a message may be delivered more than once.

Therefore consumers must be idempotent.

For the dispatcher:

Bad design:

```text
Every consumed job sends provider request blindly.
```

If the job is redelivered, the provider may receive duplicate sends.

Better design:

```text
Use stable message ID/idempotency key.
Before sending or updating, check whether message already reached terminal state.
Provider request includes idempotency key where supported.
Status updates are conditional.
```

Interview phrasing:

> I assume at-least-once delivery and design consumers to be idempotent. Exactly-once is usually not something I rely on end-to-end across queues, databases, and external APIs.

## Retries, Backoff, and DLQ

Retries help transient failures but can make outages worse.

Bad retry behavior:

```text
Provider returns 500 -> every dispatcher retries immediately -> provider gets hammered -> outage worsens
```

Better behavior:

- exponential backoff,
- jitter,
- max retry count,
- DLQ for poison messages,
- circuit breaker or rate limit during provider outage,
- metrics for retry rate and DLQ depth.

Project example:

- Provider 429: retry later with backoff.
- Provider 500/503: retry with backoff until max attempts.
- Malformed payload: DLQ immediately or after minimal retry.
- Duplicate message: no-op idempotent success.

## Backpressure

Backpressure means the system slows intake or processing to avoid collapse.

For campaign delivery:

- If provider quota is low, scheduler should release jobs slower.
- If queue depth grows too fast, API may accept campaigns but schedule later, or limit campaign size.
- If dispatcher is overloaded, HPA can scale workers.
- If database is saturated, adding more workers may make things worse.

Senior point:

> Autoscaling is not a substitute for backpressure. Scaling workers can help until the bottleneck moves to the database, provider, or network. A reliable system needs both scaling and flow control.

## Day 6 Lab

Practice one incident:

Scenario:

```text
Provider simulator starts returning 429. Queue depth grows. Campaign status remains queued/retried. API is still healthy.
```

Explain:

1. User impact: messages delayed, campaign status not terminal.
2. Metrics: provider_rate_limited_total rising, queue_depth rising, oldest_message_age rising.
3. Logs: dispatcher provider response events show 429.
4. Mitigation: reduce dispatch rate, scale if appropriate, pause large campaigns, wait for provider recovery.
5. Long-term: rate-limit aware scheduler, backoff with jitter, provider quotas dashboard, alert on backlog age.

---

# Day 7 — Senior Interview Mode

## The 90-Second Project Pitch

Memorize a version of this:

> I built a distributed campaign delivery platform as a production-style EKS and observability portfolio project. The application simulates a real async delivery system: a campaign API accepts campaign requests, messages are queued through NATS, dispatchers consume jobs, a provider simulator returns success, latency, rate limits, or failures, and state is persisted in PostgreSQL. The platform side is designed around Helm, Argo CD GitOps, Terraform-managed AWS/EKS infrastructure, and open-source observability with Prometheus, Grafana, Loki, Tempo, and OpenTelemetry. The goal was not just to deploy an app to Kubernetes, but to practice operating it: SLOs, alerts, queue backlog incidents, provider failures, retries, DLQ behavior, and runbooks.

## Common Senior Questions and Strong Answers

### Question: How would you debug a pod in CrashLoopBackOff?

Answer:

> I would start with `kubectl describe pod` to inspect events, image pull issues, probes, OOM kills, and scheduling messages. Then I would check `kubectl logs`, including `--previous` if the container restarted. I would verify recent deployment changes, config maps, secrets, and environment variables. If it is an OOM kill, I would inspect memory usage and limits. If it is a failed dependency, I would check readiness design and downstream connectivity. I try to separate application crash, config issue, resource issue, and platform scheduling issue.

### Question: How would you design observability for this platform?

Answer:

> I would use Prometheus for metrics, Grafana for dashboards, Loki for structured logs, Tempo for traces, and OpenTelemetry for instrumentation and collection. For the API I would track RED metrics: request rate, errors, latency. For the dispatcher and queue, I would track throughput, retry rate, provider latency, queue depth, oldest message age, and DLQ count. Logs would include service, event, campaign ID, message ID, and correlation ID. Traces would propagate context from campaign creation through queue publishing and dispatch. The main goal is to debug an async campaign lifecycle end-to-end.

### Question: What is your EKS architecture?

Answer:

> Terraform provisions the AWS foundation: VPC, EKS, ECR, IAM roles, and supporting add-ons. Kubernetes workloads are deployed through Helm and Argo CD. The AWS Load Balancer Controller handles ALB ingress. IRSA gives AWS permissions to specific controllers or workloads without static credentials. The platform is cost-controlled with local-first kind development, small dev nodes, budget alerts, and teardown docs. For data services, I use in-cluster PostgreSQL/NATS for demo, while noting that production would usually evaluate managed services such as RDS depending on requirements.

### Question: Why Argo CD instead of a normal CI/CD deploy?

Answer:

> CI/CD can push changes into a cluster, but GitOps gives continuous reconciliation, drift detection, auditability, and a clean rollback path through Git. Argo CD compares desired state in Git against live cluster state. If someone changes a resource manually, Argo shows drift or self-heals depending on policy. For platform teams, that creates a clearer operating model than ad hoc deployment scripts.

### Question: How do you prevent duplicate message sends?

Answer:

> I assume the queue provides at-least-once delivery, so duplicate delivery is possible. The dispatcher should use idempotency keys and stable message IDs. Before sending, it should check whether the message is already terminal or whether an idempotent send record exists. Status updates should be conditional. If the provider supports idempotency keys, pass one. Exactly-once end-to-end is not something I would assume across a queue, database, and external provider.

### Question: What makes an alert good?

Answer:

> A good alert is actionable and tied to user impact or imminent user impact. For this platform, API 5xx rate, p95 latency, oldest queued message age, and no dispatcher consumption while backlog exists are better paging signals than every individual pod restart. Infrastructure alerts are still useful, but they should support diagnosis and ticketing rather than page constantly.

---

# Emergency Knowledge Priorities If You Only Have 2–3 Days

If one week collapses into a few days, focus on these:

## Must Explain Clearly

1. Kubernetes Deployment/Service/probes/resources.
2. EKS: control plane, nodes, VPC CNI, ALB Controller, IRSA.
3. Argo CD: Git desired state vs live cluster, sync, drift, rollback.
4. Observability: metrics vs logs vs traces, Prometheus/Grafana/Loki/Tempo/OTel.
5. SRE: SLI/SLO/error budget/actionable alerts.
6. Distributed systems: at-least-once delivery, idempotency, retries, DLQ, backpressure.

## Must Be Able To Whiteboard

```text
User -> ALB -> campaign-api -> PostgreSQL
                         |
                         v
                    NATS JetStream
                         |
                         v
                    dispatcher -> provider-simulator
                         |
                         v
                    PostgreSQL status update

Metrics -> Prometheus -> Grafana/Alertmanager
Logs -> Loki -> Grafana
Traces -> OTel Collector -> Tempo -> Grafana
Git -> Argo CD -> Kubernetes
Terraform -> AWS/EKS foundation
```

## Must Have One Good Incident Story

Use provider rate limiting:

> Provider starts returning 429, dispatcher retries, backlog grows, oldest queued message age breaches SLO, Alertmanager fires, Grafana shows provider_rate_limited_total and queue_depth rising, Loki logs show 429 provider responses, mitigation is throttle dispatch and respect provider quotas, long-term fix is backoff with jitter, rate-limit-aware scheduling, and backlog alerting.

---

# Hands-On Commands To Know Cold

## Kubernetes

```bash
kubectl get pods -A
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns>
kubectl logs <pod> -n <ns> --previous
kubectl get events -A --sort-by=.lastTimestamp
kubectl get svc,endpoints,ingress -n <ns>
kubectl top pods -A
kubectl top nodes
kubectl rollout status deploy/<name> -n <ns>
kubectl rollout history deploy/<name> -n <ns>
kubectl rollout undo deploy/<name> -n <ns>
```

## Helm

```bash
helm lint deploy/helm/campaign-platform
helm template campaign-platform deploy/helm/campaign-platform -f values-local.yaml
helm upgrade --install campaign-platform deploy/helm/campaign-platform -n campaign-platform --create-namespace
helm list -A
helm history campaign-platform -n campaign-platform
```

## Argo CD

```bash
argocd app list
argocd app get <app>
argocd app diff <app>
argocd app sync <app>
argocd app rollback <app> <revision>
```

## Terraform

```bash
terraform fmt -recursive
terraform init
terraform validate
terraform plan
terraform apply
terraform destroy
```

## Local Project

```bash
cd /Users/user/projects/distributed-campaign-platform
. .venv/bin/activate
ruff check .
python -m pytest -q
docker compose up --build -d
scripts/local/e2e-smoke-test.sh
docker compose down
```

---

# Final Senior Framing

Do not say:

> I am fresh on Kubernetes and trying to learn it.

Say:

> My background is strong in AWS, DevOps, CI/CD, infrastructure, and reliability. I built this project to deepen hands-on EKS, Kubernetes-native operations, GitOps, and open-source observability. The project is intentionally designed around a realistic async distributed system so I can reason about scaling, failure modes, SLOs, and incident response, not just deploy a toy app.

That framing is accurate and much stronger.
