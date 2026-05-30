provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile

  default_tags {
    tags = merge(
      {
        project     = "distributed-campaign-platform"
        environment = "dev"
        managed_by  = "terraform"
      },
      var.tags,
    )
  }
}
