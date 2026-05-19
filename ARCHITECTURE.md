# Vivadeo Architecture

Vivadeo is a browser-first SaaS for semantic video search. The production stack
runs on Docker Compose with a public Next.js web app in front of a private
FastAPI/Celery backend. GPU embedding remains delegated to Modal.

## Runtime Topology

```text
browser
  -> web: Next.js app on port 3000
     -> Better Auth routes backed by Postgres
     -> authenticated API proxy routes
        -> api: FastAPI on the private Compose network
           -> postgres: relational data and pgvector embeddings
           -> redis: Celery broker/result backend
           -> minio: original videos and generated clips
           -> worker: Celery ingestion, embedding, and clipping jobs
              -> Modal Qwen3-VL embedder
```

Only `web` is intended to be publicly exposed. Postgres, Redis, MinIO, FastAPI,
and the worker are internal services on the Compose network.

## Services

- `web`: Next.js App Router application. Serves the marketing site, auth pages,
  signed-in product UI, workspace selection, and authenticated proxy routes.
- `api`: FastAPI service for videos, jobs, clips, search, media, stats, and
  workspace settings. It trusts browser traffic only after it has been proxied
  by `web` with the internal service key.
- `worker`: Celery worker that downloads uploads or URLs, chunks video with
  ffmpeg, calls Modal for embeddings, writes pgvector rows, and trims clips.
- `postgres`: Primary database for product records, auth records, memberships,
  jobs, clips, and vectors.
- `redis`: Celery broker and result backend.
- `minio`: S3-compatible object store for uploaded source videos and generated
  clips.
- `modal`: External GPU runtime hosting `Qwen/Qwen3-VL-Embedding-2B`.

## Request Boundaries

Browser requests should not call FastAPI directly. They call Next.js routes:

- `/api/auth/...` for Better Auth.
- `/api/proxy/...` for product API calls.
- `/api/workspace/select` for active workspace selection.

Next.js attaches:

- `X-Internal-Service-Key` from `VIVADEO_INTERNAL_SERVICE_KEY`.
- `X-Workspace-ID` from the selected organization/workspace.

FastAPI still supports direct API-key access for operator and CLI flows using:

```text
X-API-Key: <VIVADEO_API_KEY>
```

## Tenancy Model

Vivadeo is multi-tenant by default. Product data belongs to an organization:

- videos
- chunks and embeddings
- ingestion and clip jobs
- clips
- dead-letter entries
- workspace settings

The web app treats organizations as workspaces. API queries are scoped by
`organization_id`, and proxied browser requests pass the selected workspace via
`X-Workspace-ID`.

Auth and team data are stored in Postgres through Better Auth and the app's
workspace tables:

- users
- sessions
- organizations
- memberships
- invites

## Data Flow

Ingestion:

```text
upload or URL
  -> Next.js proxy
  -> FastAPI creates Video and Job records for the workspace
  -> Celery receives the job through Redis
  -> worker stores source media in MinIO
  -> worker chunks and preprocesses the video
  -> worker sends chunk bytes to Modal
  -> Modal returns normalized embeddings
  -> worker writes pgvector chunk rows
  -> Job succeeds and Video becomes ready
```

Search:

```text
query
  -> Next.js proxy
  -> FastAPI embeds text through Modal
  -> Postgres/pgvector nearest-neighbor search within organization_id
  -> FastAPI returns timestamped matches
```

Clip creation:

```text
clip request
  -> Next.js proxy
  -> FastAPI creates Clip and Job records
  -> worker downloads source video from MinIO
  -> ffmpeg trims the requested range
  -> worker uploads the clip to MinIO
  -> API returns a web-proxied media URL
```

## Configuration

Root `.env` is shared by Compose services. Important production variables:

- `VIVADEO_API_KEY`: direct API/CLI credential.
- `VIVADEO_INTERNAL_SERVICE_KEY`: private web-to-api credential.
- `VIVADEO_DEFAULT_ORG_ID`: fallback workspace for operator flows.
- `DATABASE_URL`: Python SQLAlchemy/Postgres URL.
- `AUTH_DATABASE_URL`: Node/Postgres URL for Better Auth.
- `BETTER_AUTH_URL`: public origin for auth callbacks and redirects.
- `BETTER_AUTH_SECRET`: secret used by Better Auth. Replace the development
  placeholder before exposing the app.
- `S3_PUBLIC_ENDPOINT_URL`: should point at `/api/proxy/v1/media` so browsers
  fetch media through the web app rather than MinIO directly.

## Deployment Notes

- Pull and run the prebuilt GHCR images with `docker compose pull` and
  `docker compose up -d`.
- The Next.js image uses `output: "standalone"` and starts with
  `node .next/standalone/server.js`.
- Modal must be configured on the host and the embedder deployed separately with
  `uv run modal deploy vivadeo/modal_app.py`.
- Database migrations run through Alembic from the Python services.
- MinIO and Postgres state are persisted in Docker volumes.

## Current Limitations

- Email provider integration is configured through environment variables, but
  production email delivery still needs real provider credentials.
- Better Auth schema/migration hardening should be revisited before external
  users are invited at scale.
- End-to-end browser tests are not yet wired into CI.
- The Compose deployment is single-host and does not include an edge reverse
  proxy or TLS termination.
