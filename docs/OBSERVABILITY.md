# Vivadeo Observability

## Overview

Vivadeo uses OpenTelemetry for application telemetry and a self-hosted OpenObserve instance for querying logs, traces, and metrics. Azure Monitor and Application Insights are intentionally not part of this observability path.

OpenTelemetry is wired into the Python API and worker images through `opentelemetry-instrument`. The deployment supplies the OTLP/HTTP endpoint and authentication through Container Apps environment variables and secrets.

## OpenObserve

Open the observability UI here:

<https://vivadeo-observe.thankfulglacier-9f4db53a.uaenorth.azurecontainerapps.io>

After signing in:

- Use **Logs** for structured application log records.
- Use **Traces** for request and background-job timelines.
- Use the `vivadeo` stream for Vivadeo telemetry.
- Filter by `service.name` to separate `vivadeo-api` and `vivadeo-worker`.

Credentials are intentionally not documented in Git. The local `.env` contains the current reference values, and the running Container Apps store ingestion credentials as secrets. Rotate the credentials if they are exposed or changed in the UI.

OpenObserve accepts OTLP logs, metrics, and traces over HTTP at the organization endpoint. See the [OpenObserve OTLP documentation](https://openobserve.ai/docs/ingestion/logs/otlp/) and [trace search API](https://openobserve.ai/docs/reference/api/traces/trace-search-api/).

## Telemetry architecture

```text
Vivadeo API ───────┐
                   ├─ OTLP/HTTP ─→ vivadeo-observe ─→ Azure Blob: telemetry
Vivadeo worker ────┘                         │
                                             └─ OpenObserve UI/API
```

The OpenObserve Container App runs the open-source single-node image. Stream data is stored in the `telemetry` Blob container. OpenObserve metadata currently uses local SQLite storage because the Azure Files mount was not compatible with its SQLite initialization; moving metadata to a dedicated PostgreSQL database remains a production hardening task.

## What agents should capture

When adding or debugging application behavior, preserve these correlation fields where available:

- `service.name`: `vivadeo-api` or `vivadeo-worker`
- `deployment.environment.name`: `production`
- `trace_id` and `span_id`
- `job_id`
- `video_id`
- `workspace_id`
- operation name and duration
- status and error type

Do not emit passwords, API keys, access tokens, private blob URLs, full video content, or unnecessary user prompt content. Keep logs structured and concise.

## Agent investigation workflow

### 1. Start with the symptom and time window

Record the approximate UTC time, affected service, workspace, video, job, and user-visible symptom. Use a narrow time range first; broad production queries are slower and noisier.

### 2. Check the service and revision state

```powershell
az containerapp revision list -g rg-vivadeo -n vivadeo-api
az containerapp revision list -g rg-vivadeo -n vivadeo-worker
az containerapp revision list -g rg-vivadeo -n vivadeo-observe
```

Look for a new revision, failed provisioning, unhealthy state, zero replicas when traffic is expected, or a sudden change after deployment.

### 3. Use live Container Apps logs for startup and crash issues

```powershell
az containerapp logs show -g rg-vivadeo -n vivadeo-api --tail 200 --type console
az containerapp logs show -g rg-vivadeo -n vivadeo-worker --tail 200 --type console
az containerapp logs show -g rg-vivadeo -n vivadeo-observe --tail 200 --type console
```

Use these for image-pull failures, import errors, startup failures, crash loops, and OpenObserve health problems. They are also useful while a new image is waiting to become healthy.

### 4. Query OpenObserve for application context

Agents may use the OpenObserve HTTP API with credentials loaded from the local secret store or `.env`. Never print the password or authorization header in tool output.

The search endpoint is:

```text
POST https://vivadeo-observe.thankfulglacier-9f4db53a.uaenorth.azurecontainerapps.io/api/default/_search
```

A narrow log query has this shape:

```json
{
  "query": {
    "sql": "SELECT * FROM vivadeo WHERE service_name = 'vivadeo-worker' ORDER BY _timestamp DESC",
    "start_time": 0,
    "end_time": 0,
    "from": 0,
    "size": 100
  },
  "search_type": "ui",
  "timeout": 0
}
```

Replace `start_time` and `end_time` with the incident window in microseconds. Add filters for `service_name`, `job_id`, `video_id`, `workspace_id`, severity, or error fields as the stream schema allows.

For trace summaries, use:

```text
GET /api/default/vivadeo/traces/latest?start_time=<microseconds>&end_time=<microseconds>&from=0&size=25
```

Use a returned `trace_id` to connect the request span, dependency spans, and worker activity. When a job ID is known but a trace is not, search logs first and then pivot to the trace ID.

### 5. Compare before and after a deployment

Compare the latest revision with the previous healthy revision. Look for changes in:

- request failure rate;
- latency and timeout duration;
- worker task duration and retry count;
- database, Redis, storage, or model-call failures;
- container restarts and readiness failures.

Do not conclude that a deployment is healthy from the web smoke test alone. Confirm that the API and worker revisions are healthy and that telemetry is arriving from the expected service names.

## Common incident paths

### API returns errors

1. Check the API revision and live console logs.
2. Query recent API errors in OpenObserve.
3. Pivot on `trace_id` to inspect dependency spans.
4. Check whether the failure is isolated to a workspace, video, or provider-backed operation.
5. Compare the current revision with the previous revision.

### A job is stuck or repeatedly retries

1. Find the `job_id` in the API or worker logs.
2. Query worker records for that job and inspect the latest status transition.
3. Follow the associated `trace_id` if present.
4. Check worker replica health, task duration, Redis connectivity, and downstream storage/model errors.
5. Do not retry a production job repeatedly without checking for duplicate side effects.

### Telemetry stops arriving

1. Check OpenObserve health:

   ```powershell
   Invoke-WebRequest "$env:OPENOBSERVE_URL/healthz" -UseBasicParsing
   ```

2. Check the `vivadeo-observe` revision and console logs.
3. Verify that the API and worker have the `OTEL_` environment variable names configured without printing their values:

   ```powershell
   az containerapp show -g rg-vivadeo -n vivadeo-api --query "properties.template.containers[0].env[?starts_with(name, \`OTEL_\`)].name" -o tsv
   az containerapp show -g rg-vivadeo -n vivadeo-worker --query "properties.template.containers[0].env[?starts_with(name, \`OTEL_\`)].name" -o tsv
   ```

4. Check for a recent credential rotation. Changing the OpenObserve admin password or email requires rotating the OTLP ingestion secret on both Vivadeo apps.

## Deployment behavior

The API image contains the OpenTelemetry Python packages and defaults to:

```text
opentelemetry-instrument uvicorn vivadeo.api:app --host 0.0.0.0 --port 8000
```

The production workflow starts the API and worker through `opentelemetry-instrument` after deploying the new image. The web container is not yet instrumented with a Node.js OpenTelemetry SDK.

Relevant files:

- `pyproject.toml`: OpenTelemetry dependencies;
- `uv.lock`: resolved dependency versions;
- `Dockerfile`: API image entrypoint;
- `.github/workflows/ci.yml`: production API and worker startup commands.

Before a production telemetry rollout, verify:

```powershell
uv sync --group test
uv run pytest tests/test_api.py -q
docker build -f Dockerfile -t vivadeo-api-otel-check .
```

The image must be published and deployed before the running API and worker can emit OpenTelemetry. Do not commit `.env` or copy credentials into documentation, issues, logs, or agent responses.

## Follow-up hardening

- Move OpenObserve metadata from local SQLite to a dedicated PostgreSQL metadata store.
- Create a dedicated OpenObserve ingestion identity/token instead of using the root admin credentials for telemetry.
- Add dashboards for API errors, API latency, worker failures, job duration, and telemetry ingestion health.
- Add OpenObserve alert destinations only after the notification channel and escalation policy are agreed.
