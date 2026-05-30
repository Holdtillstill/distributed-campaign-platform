# EKS Dev Environment

This environment provisions the AWS pieces needed for an ephemeral EKS demo:

- VPC built from scratch for a new AWS account
- public subnets in three Availability Zones for internet-facing ALBs and NAT gateways
- private subnets in three Availability Zones for EKS managed nodes and pods
- small dedicated control-plane subnets for EKS cross-account ENIs
- one NAT gateway by default for cost-controlled demos, with a one-per-AZ option for higher availability
- VPC endpoints for ECR, S3, STS, EC2, SQS, CloudWatch Logs, ELB, SSM, and Secrets Manager
- EKS cluster with IRSA enabled
- managed node group
- ECR repositories for the four app images
- SQS Standard queues with DLQs for broadcast shards, inbound MO events, and outbound MT jobs
- EBS CSI driver IRSA role and add-on for `gp3` PVCs
- AWS Load Balancer Controller IRSA role
- External Secrets Operator IRSA role for Secrets Manager or SSM Parameter Store
- application IRSA role for the `campaign-platform` service account to publish and consume SQS messages

The default Kubernetes version is `1.35`, which is in EKS standard support as of May 30, 2026. Change `cluster_version` only after checking the current EKS support window.

## Apply

```bash
cp terraform.tfvars.example terraform.tfvars
# Replace cluster_endpoint_public_access_cidrs with your VPN, office, or current IP /32.
terraform init
terraform plan
terraform apply
aws eks update-kubeconfig --region us-west-2 --name campaign-platform-dev
```

## Network Shape

Defaults follow the EKS public/private subnet pattern:

- public route tables point at the internet gateway
- private route tables point at the dev NAT gateway by default
- EKS nodes run in private subnets
- public subnets carry `kubernetes.io/role/elb=1`
- private subnets carry `kubernetes.io/role/internal-elb=1`
- the EKS API endpoint has private access enabled and public access restricted by `cluster_endpoint_public_access_cidrs`

For a higher-availability network demo, set `single_nat_gateway = false` and `one_nat_gateway_per_az = true`. That avoids cross-AZ dependency for private subnet egress, but it adds two more hourly NAT Gateway charges.

## Destroy

Keep this environment ephemeral unless you intentionally want an always-on bill:

```bash
terraform destroy
```
