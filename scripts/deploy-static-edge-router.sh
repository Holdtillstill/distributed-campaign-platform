#!/usr/bin/env bash
set -euo pipefail

: "${CLOUDFRONT_DISTRIBUTION_ID:?Set CLOUDFRONT_DISTRIBUTION_ID}"
: "${CLOUDFRONT_FUNCTION_NAME:?Set CLOUDFRONT_FUNCTION_NAME}"

function_source="${STATIC_EDGE_ROUTER_SOURCE:-deploy/cloudfront/static-spa-router.js}"
if [ ! -f "${function_source}" ]; then
  echo "CloudFront Function source not found: ${function_source}" >&2
  exit 1
fi

function_config="Comment=Static portfolio SPA router for Distributed Campaign Platform,Runtime=cloudfront-js-2.0"
function_etag="$(aws cloudfront describe-function \
  --name "${CLOUDFRONT_FUNCTION_NAME}" \
  --stage DEVELOPMENT \
  --query ETag \
  --output text 2>/dev/null || true)"

if [ -z "${function_etag}" ] || [ "${function_etag}" = "None" ]; then
  function_etag="$(aws cloudfront create-function \
    --name "${CLOUDFRONT_FUNCTION_NAME}" \
    --function-config "${function_config}" \
    --function-code "fileb://${function_source}" \
    --query ETag \
    --output text)"
else
  function_etag="$(aws cloudfront update-function \
    --name "${CLOUDFRONT_FUNCTION_NAME}" \
    --if-match "${function_etag}" \
    --function-config "${function_config}" \
    --function-code "fileb://${function_source}" \
    --query ETag \
    --output text)"
fi

aws cloudfront publish-function \
  --name "${CLOUDFRONT_FUNCTION_NAME}" \
  --if-match "${function_etag}" \
  --query FunctionSummary.Name \
  --output text >/dev/null

function_arn="$(aws cloudfront describe-function \
  --name "${CLOUDFRONT_FUNCTION_NAME}" \
  --stage LIVE \
  --query FunctionSummary.FunctionMetadata.FunctionARN \
  --output text)"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "${tmp_dir}"' EXIT

distribution_config="${tmp_dir}/distribution-config.json"
updated_config="${tmp_dir}/distribution-config-updated.json"

distribution_etag="$(aws cloudfront get-distribution-config \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --query ETag \
  --output text)"

aws cloudfront get-distribution-config \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --query DistributionConfig \
  --output json >"${distribution_config}"

FUNCTION_ARN="${function_arn}" node - "${distribution_config}" "${updated_config}" <<'NODE'
const fs = require("node:fs");

const [sourcePath, targetPath] = process.argv.slice(2);
const functionArn = process.env.FUNCTION_ARN;
const config = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const defaultBehavior = config.DefaultCacheBehavior;
const associations = defaultBehavior.FunctionAssociations || { Quantity: 0 };
const items = (associations.Items || []).filter((item) => item.EventType !== "viewer-request");

items.push({
  EventType: "viewer-request",
  FunctionARN: functionArn
});

defaultBehavior.FunctionAssociations = {
  Quantity: items.length,
  Items: items
};

fs.writeFileSync(targetPath, `${JSON.stringify(config, null, 2)}\n`);
NODE

aws cloudfront update-distribution \
  --id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --if-match "${distribution_etag}" \
  --distribution-config "file://${updated_config}" \
  --query Distribution.Status \
  --output text >/dev/null

aws cloudfront wait distribution-deployed --id "${CLOUDFRONT_DISTRIBUTION_ID}"
echo "Static edge router is published and associated."
