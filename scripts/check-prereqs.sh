#!/usr/bin/env bash
set -euo pipefail

commands=(
  git
  docker
  python3
  terraform
  kubectl
  helm
  aws
  jq
  kind
  k9s
  argocd
  eksctl
  trivy
  checkov
  tfsec
  k6
  yq
  pre-commit
  direnv
  tflint
)

printf "%-14s %s\n" "COMMAND" "STATUS"
printf "%-14s %s\n" "-------" "------"

missing=()
for cmd in "${commands[@]}"; do
  if command -v "$cmd" >/dev/null 2>&1; then
    version="$($cmd --version 2>&1 | head -n 1 || true)"
    printf "%-14s %s\n" "$cmd" "OK - ${version}"
  else
    printf "%-14s %s\n" "$cmd" "MISSING"
    missing+=("$cmd")
  fi
done

printf "\nAWS caller identity:\n"
if aws sts get-caller-identity >/tmp/dcp-aws-identity.json 2>/tmp/dcp-aws-identity.err; then
  cat /tmp/dcp-aws-identity.json
else
  cat /tmp/dcp-aws-identity.err
fi

if ((${#missing[@]} > 0)); then
  printf "\nMissing commands: %s\n" "${missing[*]}"
  printf "Install missing tools before the EKS phases. Local app development can start once Docker and Python are ready.\n"
  exit 1
fi
