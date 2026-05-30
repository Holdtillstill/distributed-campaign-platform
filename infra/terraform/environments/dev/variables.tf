variable "aws_region" {
  description = "AWS region for the ephemeral EKS dev environment."
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "Optional local AWS profile name."
  type        = string
  default     = null
}

variable "name" {
  description = "Base name for EKS, VPC, ECR, and IAM resources."
  type        = string
  default     = "campaign-platform-dev"
}

variable "cluster_version" {
  description = "EKS Kubernetes minor version."
  type        = string
  default     = "1.35"
}

variable "availability_zone_count" {
  description = "Number of Availability Zones to use for public, private, and control-plane subnets."
  type        = number
  default     = 3

  validation {
    condition     = var.availability_zone_count >= 2 && var.availability_zone_count <= 3
    error_message = "availability_zone_count must be 2 or 3 for this dev network layout."
  }
}

variable "vpc_cidr" {
  description = "CIDR range for the dev VPC."
  type        = string
  default     = "10.42.0.0/16"
}

variable "cluster_endpoint_public_access" {
  description = "Whether the EKS Kubernetes API has a public endpoint for operators outside the VPC."
  type        = bool
  default     = true
}

variable "cluster_endpoint_private_access" {
  description = "Whether the EKS Kubernetes API has private VPC endpoint access."
  type        = bool
  default     = true
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "CIDR blocks allowed to reach the public EKS API endpoint. Replace the example with operator VPN or office /32 ranges before apply."
  type        = list(string)
  default     = ["203.0.113.0/24"]
}

variable "enable_nat_gateway" {
  description = "Create NAT gateways so private subnets have controlled outbound internet access."
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway for cost-saving demos. Set false with one_nat_gateway_per_az=true for zone-independent private egress."
  type        = bool
  default     = true
}

variable "one_nat_gateway_per_az" {
  description = "Create a NAT gateway per AZ for zone-independent private subnet egress. This should be false when single_nat_gateway is true."
  type        = bool
  default     = false
}

variable "enable_vpc_endpoints" {
  description = "Create private VPC endpoints for common AWS APIs used by EKS nodes and controllers."
  type        = bool
  default     = true
}

variable "cloudwatch_log_retention_days" {
  description = "Retention in days for EKS control plane logs."
  type        = number
  default     = 30
}

variable "node_instance_types" {
  description = "Small, low-cost node shape for ephemeral demos."
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_min_size" {
  description = "Minimum managed node count."
  type        = number
  default     = 1
}

variable "node_desired_size" {
  description = "Desired managed node count."
  type        = number
  default     = 2
}

variable "node_max_size" {
  description = "Maximum managed node count."
  type        = number
  default     = 4
}

variable "tags" {
  description = "Additional tags applied to AWS resources."
  type        = map(string)
  default     = {}
}
