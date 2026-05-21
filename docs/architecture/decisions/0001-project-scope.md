# ADR 0001: Project Scope

## Status

Accepted

## Context

The goal is to build a portfolio project that demonstrates EKS, Kubernetes operations, open-source observability, GitOps, reliability engineering, and AWS platform skills.

A basic `API → queue → worker → database` app would be too small for a senior DevOps/platform portfolio. A full SaaS product with billing, auth, compliance, real SMS/email providers, and a complex UI would distract from the platform goals.

## Decision

Build a distributed campaign delivery simulator with moderate distributed-systems complexity:

- campaign ingestion
- audience segmentation/fan-out
- scheduling and backpressure
- queue/stream-based dispatch
- provider simulation with latency, 429s, 500s, and callbacks
- idempotency, retries, and DLQ
- status aggregation
- full metrics/logs/traces and incident runbooks

Out of scope for v1:

- real SMS/email providers
- billing
- complex authentication/authorization
- real user/customer data
- multi-region active-active
- service mesh
- custom Kubernetes operators

## Consequences

The application is distributed enough to make Kubernetes, observability, autoscaling, and incident response meaningful, while remaining small enough to finish and present publicly.
