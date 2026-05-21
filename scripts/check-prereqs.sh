#!/usr/bin/env bash
set -euo pipefail

commands=(
  git
  docker
  python3.12
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
version_for() {
  case "$1" in
    kubectl) kubectl version --client=true 2>&1 | head -n 1 ;;
    helm) helm version 2>&1 | head -n 1 ;;
    k9s) k9s version 2>&1 | grep 'Version:' | head -n 1 ;;
    tfsec) tfsec --version 2>&1 | tail -n 1 ;;
    argocd) argocd version --client 2>&1 | head -n 1 ;;
    eksctl) eksctl version 2>&1 | head -n 1 ;;
    python3.12) python3.12 --version 2>&1 | head -n 1 ;;
    *) "$1" --version 2>&1 | head -n 1 ;;
  esac
}

python_cmd="python3.12"

for cmd in "${commands[@]}"; do
  if command -v "$cmd" >/dev/null 2>&1; then
    version="$(version_for "$cmd" || true)"
    printf "%-14s %s\n" "$cmd" "OK - ${version}"
  else
    printf "%-14s %s\n" "$cmd" "MISSING"
    missing+=("$cmd")
  fi
done

python_version="$($python_cmd - <<'PY'
import sys
print(f'{sys.version_info.major}.{sys.version_info.minor}')
PY
)"
if $python_cmd - <<'PY'
import sys
raise SystemExit(0 if sys.version_info >= (3, 12) else 1)
PY
then
  printf "%-14s %s\n" "python>=3.12" "OK - ${python_version}"
else
  printf "%-14s %s\n" "python>=3.12" "MISSING - found ${python_version}"
  missing+=("python>=3.12")
fi

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
