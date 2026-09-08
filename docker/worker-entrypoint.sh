#!/bin/sh
set -eu

exec opentelemetry-instrument celery \
    -A vivadeo.worker.celery_app \
    worker \
    -Q celery,chat,evidence \
    --loglevel=INFO \
    --concurrency "${VIVADEO_WORKER_CONCURRENCY:-2}" \
    --max-tasks-per-child=100
