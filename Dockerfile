FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md uv.lock ./
COPY vivadeo ./vivadeo
COPY alembic.ini ./
COPY alembic ./alembic
COPY docker/api-entrypoint.sh /usr/local/bin/vivadeo-api
COPY docker/worker-entrypoint.sh /usr/local/bin/vivadeo-worker

RUN pip install --no-cache-dir uv \
    && uv pip install --system . \
    && chmod +x /usr/local/bin/vivadeo-api \
    && chmod +x /usr/local/bin/vivadeo-worker

EXPOSE 8000

CMD ["/usr/local/bin/vivadeo-api"]
