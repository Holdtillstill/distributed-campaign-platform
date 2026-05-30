# Terraform

## Environments

- `environments/dev`: ephemeral AWS EKS environment with a new-account VPC baseline, public/private/control-plane subnets across Availability Zones, cost-optimized NAT by default, VPC endpoints including SQS, ECR repositories, SQS queues, a private managed node group, EBS CSI storage support, and IRSA roles for AWS Load Balancer Controller, External Secrets Operator, and the app workload.

Start with the dev environment:

```bash
cd infra/terraform/environments/dev
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
```
