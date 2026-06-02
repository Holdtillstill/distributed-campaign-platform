FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/shared:/app/apps/dispatcher/app \
    DISPATCHER_WORKER_ENABLED=true

WORKDIR /app

RUN pip install --default-timeout=100 --no-cache-dir \
    "asyncpg>=0.29" \
    "boto3>=1.34" \
    "fastapi>=0.115" \
    "httpx>=0.27" \
    "nats-py>=2.8" \
    "opentelemetry-api>=1.26" \
    "opentelemetry-sdk>=1.26" \
    "opentelemetry-exporter-otlp>=1.26" \
    "opentelemetry-instrumentation-fastapi>=0.47b0" \
    "opentelemetry-instrumentation-httpx>=0.47b0" \
    "prometheus-client>=0.20" \
    "pydantic>=2.8" \
    "structlog>=24.0" \
    "uvicorn[standard]>=0.30"

COPY apps/shared /app/apps/shared
COPY apps/dispatcher/app /app/apps/dispatcher/app

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
