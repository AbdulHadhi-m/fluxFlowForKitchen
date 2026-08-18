FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root system user for security hardening
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app -s /sbin/nologin appuser

COPY backend /app
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000
