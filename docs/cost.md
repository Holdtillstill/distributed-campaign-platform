# Cost Model

## Strategy

This project is local-first and ephemeral-cloud by default.

Most development should happen in Docker Compose or kind at $0 AWS cost. EKS should be created only for integration testing, final screenshots, and approved runtime demo preparation.

## Approximate costs

| Scenario | Estimate |
|---|---:|
| Local-only development | $0 |
| Short EKS workshop/demo, ~40 hours/month, cost-optimized dev network | ~$20–45/month |
| Active ephemeral EKS development, ~176 hours/month, cost-optimized dev network | ~$130–210/month |
| Active ephemeral EKS development, ~176 hours/month, one NAT per AZ | ~$180–260/month |
| Always-on lean EKS, no NAT | ~$160/month |
| Always-on EKS with 3 NAT Gateways | ~$260–320/month |
| Full always-on demo with larger nodes/extra ALBs/NAT | ~$350–400/month |

## Main cost drivers

- EKS control plane: about $0.10/hour, roughly $73/month if always on
- EC2 worker nodes
- NAT Gateways: about $33/month each before data processing
- VPC interface endpoints when enabled
- Application Load Balancers
- EBS volumes
- log/metric/trace retention

## Guardrails

- Create AWS Budgets alerts at $25, $50, and $100
- Use `us-west-2` as the default workload region
- Tag all resources with project/environment/owner
- Use local mode for app development
- Use short retention for logs/metrics/traces
- Prefer one dev environment initially
- Tear down EKS after each cloud test window
- Use one NAT gateway for the default dev environment, then switch to one NAT gateway per AZ only when demonstrating higher availability
