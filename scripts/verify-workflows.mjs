import { readFile, readdir } from "node:fs/promises"

const workflowsDir = new URL("../.github/workflows/", import.meta.url)

const expectedWorkflows = [
  "ci.yaml",
  "dependency-audit.yml",
  "image-publish.yaml",
  "secret-scan.yml",
  "security.yml",
  "static-deploy.yml",
  "static-smoke.yml",
]

function assertIncludes(text, needle, context) {
  if (!text.includes(needle)) {
    throw new Error(`${context} is missing: ${needle}`)
  }
}

function assertAll(text, needles, context) {
  for (const needle of needles) assertIncludes(text, needle, context)
}

function assertNotMatches(text, pattern, context) {
  if (pattern.test(text)) {
    throw new Error(`${context} unexpectedly matches ${pattern}`)
  }
}

async function readWorkflow(name) {
  return readFile(new URL(name, workflowsDir), "utf8")
}

const workflowFiles = (await readdir(workflowsDir)).filter((name) => /\.(ya?ml)$/.test(name)).sort()
if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflows)) {
  throw new Error(`Workflow set changed. Expected ${expectedWorkflows.join(", ")}; got ${workflowFiles.join(", ")}`)
}

const ci = await readWorkflow("ci.yaml")
assertAll(
  ci,
  [
    "permissions:\n  contents: read",
    "uv run pytest",
    "node scripts/check-public-readiness.mjs",
    "node scripts/verify-workflows.mjs",
    "npm test -- --run",
    "npm run build",
    "node scripts/validate-static-spa-router.mjs",
    "helm lint deploy/helm/campaign-platform",
    "helm template campaign-platform deploy/helm/campaign-platform",
    "values-eks-dev.yaml",
    "docker build -t campaign-api:ci",
    "docker build -t dispatcher:ci",
    "docker build -t provider-simulator:ci",
    "docker build -t web-ui:ci",
    "aquasecurity/trivy-action@v0.36.0",
    "image-ref: campaign-api:ci",
    "image-ref: dispatcher:ci",
    "image-ref: provider-simulator:ci",
    "image-ref: web-ui:ci",
  ],
  "ci.yaml",
)

const staticDeploy = await readWorkflow("static-deploy.yml")
assertAll(
  staticDeploy,
  [
    "permissions:\n  contents: read\n  id-token: write",
    "AWS_ROLE_TO_ASSUME",
    "STATIC_SITE_BUCKET",
    "CLOUDFRONT_DISTRIBUTION_ID",
    "CLOUDFRONT_FUNCTION_NAME",
    "SITE_URL",
    "node scripts/validate-static-spa-router.mjs",
    "npx playwright install --with-deps chromium",
    "npm test -- --run",
    "VITE_STATIC_PORTFOLIO_HOST=true npm run build",
    "aws-actions/configure-aws-credentials@v6",
    "mask-aws-account-id: true",
    "scripts/deploy-static-edge-router.sh",
    "aws s3 sync apps/web-ui/dist/",
    "aws cloudfront create-invalidation",
    "WEB_BASE=\"${SITE_URL}\" node scripts/smoke-static-host.mjs",
    "WEB_BASE=\"${SITE_URL}\" npm run smoke:browser-host",
  ],
  "static-deploy.yml",
)

const staticSmoke = await readWorkflow("static-smoke.yml")
assertAll(
  staticSmoke,
  [
    "schedule:",
    "SITE_URL",
    "npx playwright install --with-deps chromium",
    "WEB_BASE=\"${SITE_URL}\" node scripts/smoke-static-host.mjs",
    "WEB_BASE=\"${SITE_URL}\" npm run smoke:browser-host",
  ],
  "static-smoke.yml",
)

const imagePublish = await readWorkflow("image-publish.yaml")
assertNotMatches(imagePublish, /^  push:/m, "image-publish.yaml")
assertAll(
  imagePublish,
  [
    "workflow_dispatch:",
    "concurrency:",
    "permissions:\n  contents: read\n  id-token: write",
    "aws-actions/configure-aws-credentials@v6",
    "mask-aws-account-id: true",
    "aws-actions/amazon-ecr-login@v2",
    "docker/build-push-action@v6",
    "push: false",
    "load: true",
    "aquasecurity/trivy-action@v0.36.0",
    "scan-type: image",
    "docker push",
  ],
  "image-publish.yaml",
)

const dependencyAudit = await readWorkflow("dependency-audit.yml")
assertAll(dependencyAudit, ["uvx pip-audit", "npm audit --audit-level=high"], "dependency-audit.yml")

const security = await readWorkflow("security.yml")
assertAll(
  security,
  ["actions/dependency-review-action@v5", "scanners: vuln,secret", "scanners: misconfig"],
  "security.yml",
)

const secretScan = await readWorkflow("secret-scan.yml")
assertAll(secretScan, ["gitleaks detect", "--redact", "Block committed cloud identifiers"], "secret-scan.yml")

console.log("workflow contracts passed")
