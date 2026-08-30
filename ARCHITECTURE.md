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
           -> private object storage: original videos and generated media
           -> Azure Communication Services Email: transactional auth email
           -> worker: Celery ingestion, embedding, and clipping jobs
              -> Modal Qwen3-VL embedder
```

Only `web` is intended to be publicly exposed. Postgres, Redis, FastAPI, and the
worker are internal services on the Compose network. The configured private
object-storage service is accessed only by the API and worker.

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
- `object store`: private Azure Blob or S3-compatible storage for uploaded source
  videos, generated clips, keyframes, evidence frames, and transcript artifacts.
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
  -> worker stores source media through the provider-neutral object adapter
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
  -> worker downloads source video from private object storage
  -> ffmpeg trims the requested range
  -> worker uploads the clip to private object storage
  -> API returns a web-proxied media URL
```

Transactional email:

```text
Better Auth verification/reset/deletion event
  -> Next.js web email helper
  -> Azure Communication Services Email SDK
  -> Azure-managed MailFrom address with Vivadeo display name
  -> recipient inbox
```

Email is a web responsibility and does not pass through FastAPI or Celery.
The Azure-managed domain removes the need for a custom domain. The sender
username is `vivadeo`, with display name `Vivadeo`.

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
- `STORAGE_BACKEND`: selects `azure` or `s3` for API and worker storage.
- `STORAGE_PUBLIC_ENDPOINT_URL`: points at `/api/proxy/v1/media` so browsers
  fetch workspace-authorized media without provider credentials.
- `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER`, and
  `AZURE_STORAGE_TIMEOUT`: private Azure Blob connection settings.
- `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and
  `S3_REGION`: connection settings used only when `STORAGE_BACKEND=s3`.
- `EMAIL_FROM`: verified Azure MailFrom address, currently the `vivadeo` sender
  on the Azure-managed `azurecomm.net` domain.
- `AZURE_COMMUNICATION_CONNECTION_STRING`: secret credential for the Azure
  Communication Services resource. Keep it in secret-managed environment
  configuration and never commit it.

## Deployment Notes

- Pull and run the prebuilt GHCR images with `docker compose pull` and
  `docker compose up -d`.
- The Next.js image uses `output: "standalone"` and starts with
  `node .next/standalone/server.js`.
- Modal must be configured on the host and the embedder deployed separately with
  `uv run modal deploy vivadeo/modal_app.py`.
- Database migrations run through Alembic from the Python services.
- Postgres state is persisted in a Docker volume. Media is persisted in the
  configured private object store.

## Current Limitations

- Azure-managed email domains have limited sending volume and less sender
  customization than a custom verified domain.
- Better Auth schema/migration hardening should be revisited before external
  users are invited at scale.
- End-to-end browser tests are not yet wired into CI.
- The Compose deployment is single-host and does not include an edge reverse
  proxy or TLS termination.
