FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/shared:/app/apps/provider-simulator/app

WORKDIR /app

COPY pyproject.toml README.md ./
COPY apps/shared ./apps/shared
COPY apps/provider-simulator ./apps/provider-simulator

RUN pip install --default-timeout=100 --no-cache-dir --upgrade pip \
    && pip install --default-timeout=100 --no-cache-dir \
    fastapi \
    opentelemetry-api \
    opentelemetry-sdk \
    opentelemetry-exporter-otlp \
    opentelemetry-instrumentation-fastapi \
    opentelemetry-instrumentation-httpx \
    prometheus-client \
    pydantic \
    structlog \
    uvicorn[standard]

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
