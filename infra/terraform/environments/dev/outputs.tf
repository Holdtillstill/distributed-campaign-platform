output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint."
  value       = module.eks.cluster_endpoint
}

output "aws_region" {
  description = "AWS region used by this environment."
  value       = var.aws_region
}

output "vpc_id" {
  description = "VPC ID for the dev EKS environment."
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs for internet-facing ALBs and NAT gateways."
  value       = module.vpc.public_subnets
}

output "private_subnet_ids" {
  description = "Private subnet IDs for EKS managed node groups."
  value       = module.vpc.private_subnets
}

output "control_plane_subnet_ids" {
  description = "Small dedicated subnets for EKS control-plane cross-account ENIs."
  value       = module.vpc.intra_subnets
}

output "nat_public_ips" {
  description = "Public Elastic IPs attached to NAT gateways."
  value       = module.vpc.nat_public_ips
}

output "ecr_repository_urls" {
  description = "ECR repository URLs keyed by service name."
  value = {
    for name, repository in aws_ecr_repository.app : name => repository.repository_url
  }
}

output "sqs_queue_urls" {
  description = "SQS queue URLs keyed by queue purpose."
  value = {
    for name, queue in aws_sqs_queue.app : name => queue.url
  }
}

output "sqs_dead_letter_queue_urls" {
  description = "SQS dead-letter queue URLs keyed by queue purpose."
  value = {
    for name, queue in aws_sqs_queue.app_dlq : name => queue.url
  }
}

output "load_balancer_controller_role_arn" {
  description = "IRSA role ARN for the AWS Load Balancer Controller service account."
  value       = module.load_balancer_controller_irsa.iam_role_arn
}

output "external_secrets_role_arn" {
  description = "IRSA role ARN for the External Secrets Operator service account."
  value       = aws_iam_role.external_secrets.arn
}

output "app_role_arn" {
  description = "IRSA role ARN for the campaign-platform application service account."
  value       = aws_iam_role.app.arn
}
