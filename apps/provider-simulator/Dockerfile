FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/shared:/app/apps/provider-simulator/app

WORKDIR /app

COPY pyproject.toml README.md ./
COPY apps/shared ./apps/shared
COPY apps/provider-simulator ./apps/provider-simulator

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir fastapi uvicorn[standard] pydantic structlog

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
