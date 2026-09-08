#!/bin/sh
set -eu

exec opentelemetry-instrument uvicorn \
    vivadeo.api:app \
    --host 0.0.0.0 \
    --port 8000
