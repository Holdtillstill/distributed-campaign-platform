from __future__ import annotations

import subprocess
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CHART_DIR = REPO_ROOT / "deploy" / "helm" / "campaign-platform"


def test_phase2_helm_chart_contains_core_workloads_and_probes() -> None:
    assert (CHART_DIR / "Chart.yaml").exists()
    assert (CHART_DIR / "values.yaml").exists()

    rendered_templates = "\n".join(
        path.read_text() for path in (CHART_DIR / "templates").glob("*.yaml")
    )

    for workload in ["campaign-api", "dispatcher", "provider-simulator"]:
        assert f"app.kubernetes.io/component: {workload}" in rendered_templates

    assert "readinessProbe:" in rendered_templates
    assert "livenessProbe:" in rendered_templates
    assert "path: /readyz" in rendered_templates
    assert "path: /healthz" in rendered_templates
    assert "path: /metrics" in rendered_templates


def test_kind_overlay_documents_local_cluster_install_path() -> None:
    kind_config = REPO_ROOT / "deploy" / "kind" / "cluster.yaml"
    deploy_script = REPO_ROOT / "scripts" / "local" / "kind-deploy.sh"

    assert kind_config.exists()
    assert deploy_script.exists()
    assert "kind: Cluster" in kind_config.read_text()
    assert "helm upgrade --install campaign-platform" in deploy_script.read_text()


def test_eks_values_render_cloud_deployment_primitives() -> None:
    rendered = _helm_template(
        "-f",
        str(CHART_DIR / "values-eks-dev.yaml"),
        "--set",
        "campaignApi.image.repository=123456789012.dkr.ecr.us-west-2.amazonaws.com/campaign-api",
        "--set",
        "providerSimulator.image.repository=123456789012.dkr.ecr.us-west-2.amazonaws.com/provider-simulator",
        "--set",
        "dispatcher.image.repository=123456789012.dkr.ecr.us-west-2.amazonaws.com/dispatcher",
        "--set",
        "webUi.image.repository=123456789012.dkr.ecr.us-west-2.amazonaws.com/web-ui",
    )
    kinds = {item["kind"] for item in rendered}

    assert "Ingress" in kinds
    assert "HorizontalPodAutoscaler" in kinds
    assert "ExternalSecret" in kinds
    assert "ServiceAccount" in kinds
    config_maps = {
        item["metadata"]["name"]: item for item in rendered if item["kind"] == "ConfigMap"
    }
    app_config = config_maps["campaign-platform-app-config"]["data"]
    assert app_config["QUEUE_PROVIDER"] == "nats"
    assert "SQS_BROADCAST_QUEUE_URL" in app_config

    app_components = {"campaign-api", "dispatcher", "provider-simulator", "web-ui"}
    deployments = [
        item
        for item in rendered
        if item["kind"] == "Deployment"
        and item["metadata"]["labels"]["app.kubernetes.io/component"] in app_components
    ]
    assert all(
        "123456789012.dkr.ecr.us-west-2.amazonaws.com"
        in item["spec"]["template"]["spec"]["containers"][0]["image"]
        for item in deployments
    )

    stateful_sets = {
        item["metadata"]["labels"]["app.kubernetes.io/component"]: item
        for item in rendered
        if item["kind"] == "StatefulSet"
    }
    assert stateful_sets["postgres"]["spec"]["volumeClaimTemplates"][0]["spec"][
        "storageClassName"
    ] == "gp3"
    assert stateful_sets["nats"]["spec"]["volumeClaimTemplates"][0]["spec"][
        "storageClassName"
    ] == "gp3"


def test_eks_values_require_real_ecr_image_repositories() -> None:
    result = subprocess.run(
        [
            "helm",
            "template",
            "campaign-platform",
            str(CHART_DIR),
            "-f",
            str(CHART_DIR / "values-eks-dev.yaml"),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode != 0
    assert "image.repository must be set to an ECR repository" in result.stderr


def test_terraform_dev_environment_and_ci_gate_exist() -> None:
    terraform_env = REPO_ROOT / "infra" / "terraform" / "environments" / "dev"
    ci_workflow = REPO_ROOT / ".github" / "workflows" / "ci.yaml"

    assert (terraform_env / "main.tf").exists()
    assert (terraform_env / "terraform.tfvars.example").exists()
    assert ci_workflow.exists()

    combined = "\n".join(path.read_text() for path in terraform_env.glob("*.tf"))
    assert "terraform-aws-modules/eks/aws" in combined
    assert "aws_ecr_repository" in combined
    assert "enable_irsa" in combined
    assert "aws-ebs-csi-driver" in combined
    assert "enable_nat_gateway" in combined
    assert "one_nat_gateway_per_az" in combined
    assert "module.vpc.private_subnets" in combined
    assert "control_plane_subnet_ids" in combined
    assert "aws_vpc_endpoint" in combined
    assert "cluster_endpoint_public_access_cidrs" in combined
    assert "aws_sqs_queue" in combined
    assert "broadcast_shards" in combined
    assert "inbound_mo" in combined
    assert "outbound_mt" in combined
    assert '"sqs"' in combined
    assert "aws_iam_role\" \"app\"" in combined
    assert "sqs:SendMessage" in combined
    assert "system:serviceaccount:campaign-platform:campaign-platform" in combined


def _helm_template(*extra_args: str) -> list[dict]:
    result = subprocess.run(
        ["helm", "template", "campaign-platform", str(CHART_DIR), *extra_args],
        check=True,
        capture_output=True,
        text=True,
    )
    return [doc for doc in yaml.safe_load_all(result.stdout) if doc]
