# Docs, observability, and product-polish pass

## User-reported issues

- `/api/docs` renders Swagger UI but shows: "Unable to render this definition. The provided definition does not specify a valid version field."
- Grafana appears to show no traces.
- Product needs another improvement pass across features, webpage/action flows, and documentation.

## Controller diagnosis before Codex

- `http://127.0.0.1:18080/api/openapi.json` returns valid OpenAPI JSON with `openapi: "3.1.0"` after refreshing the web-ui port-forward.
- `http://127.0.0.1:18080/api/docs` returns Swagger UI HTML, but the HTML config contains `url: '/openapi.json'`.
- Because the API is accessed through the web UI proxy under `/api`, Swagger tries to fetch the wrong schema URL. Expected proxied schema URL is `/api/openapi.json`.
- Observability namespace has running Prometheus, Grafana, Loki, Tempo, and OpenTelemetry Collector pods/services.
- Helm values set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-opentelemetry-collector.observability.svc.cluster.local:4317` for non-web services, and the collector exports traces to Tempo.

## Requested slice

1. Fix proxied Swagger/OpenAPI docs at `/api/docs`.
2. Improve/verify trace emission and document how to see traces in Grafana/Tempo.
3. Add or improve product docs:
   - SaaS company product doc
   - architecture diagram
   - runbooks
   - external-user knowledge base / app instructions
4. Continue product/action-flow polish where low risk and covered by tests.

## Controller requirements

- Use TDD where practical.
- Preserve existing local-first/kind workflow.
- Do not deploy cloud resources or use real paid APIs/secrets.
- Do not touch unrelated untracked files unless explicitly part of this slice.
- Do not commit; controller will verify, deploy, QA, and commit.
