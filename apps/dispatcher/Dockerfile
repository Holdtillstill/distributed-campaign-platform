FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/shared:/app/apps/dispatcher/app \
    DISPATCHER_WORKER_ENABLED=true

WORKDIR /app

RUN pip install --no-cache-dir \
    "asyncpg>=0.29" \
    "fastapi>=0.115" \
    "httpx>=0.27" \
    "nats-py>=2.8" \
    "pydantic>=2.8" \
    "uvicorn[standard]>=0.30"

COPY apps/shared /app/apps/shared
COPY apps/dispatcher/app /app/apps/dispatcher/app

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
