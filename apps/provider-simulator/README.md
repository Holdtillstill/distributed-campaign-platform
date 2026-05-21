# Provider Simulator

FastAPI mock provider used by the distributed campaign platform for local and test delivery flows.

## API

- `GET /healthz` returns service health.
- `POST /send` accepts:

```json
{
  "message_id": "msg-123",
  "recipient": "+15555550100",
  "body": "hello",
  "channel": "sms"
}
```

Responses include `provider_message_id`, `message_id`, `status`, and `reason` for failures.

## Configuration

Environment variables:

- `PROVIDER_MODE`: `success`, `rate_limit`, `server_error`, or `flaky` (default: `success`)
- `PROVIDER_LATENCY_MS`: non-negative artificial latency in milliseconds (default: `0`)
- `PROVIDER_FAILURE_RATE`: flaky-mode failure probability from `0.0` to `1.0` (default: `0.0`)

## Local run

From the repository root:

```bash
. .venv/bin/activate
PYTHONPATH=apps/shared:apps/provider-simulator/app \
  PROVIDER_MODE=success \
  uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

Example request:

```bash
curl -s -X POST http://localhost:8080/send \
  -H 'content-type: application/json' \
  -d '{"message_id":"msg-123","recipient":"+15555550100","body":"hello"}'
```

## Docker

```bash
docker build -f apps/provider-simulator/Dockerfile -t provider-simulator .
docker run --rm -p 8080:8080 -e PROVIDER_MODE=flaky -e PROVIDER_FAILURE_RATE=0.2 provider-simulator
```

## Tests

```bash
. .venv/bin/activate
python -m pytest tests/unit/test_provider_simulator.py -v
```
