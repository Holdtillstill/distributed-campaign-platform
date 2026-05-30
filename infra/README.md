# Infrastructure

Terraform infrastructure for AWS lives here.

- `terraform/environments/dev` provisions an ephemeral EKS demo environment from a brand-new account baseline: VPC, public/private/control-plane subnets, cost-optimized NAT by default, VPC endpoints, ECR repositories, SQS queues, IRSA roles, and the EBS CSI add-on.

Keep dev clusters short-lived. Create the environment for integration testing or screenshots, then destroy it when the demo window is done.
