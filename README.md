# Vivadeo

Vivadeo is a workspace-based video archive for finding and working with
specific moments in footage. Upload or import video, let the background
pipeline prepare it, then ask questions in chat and review answers with
timestamped video evidence.

The current product is the browser app. It includes:

- workspace authentication, members, roles, and workspace switching;
- local-file upload and HTTP(S) URL ingest;
- transcript-grounded chat with spoken-content, visual-moment, and focused
  video questions;
- timestamped citations and source attribution;
- library browsing with archive, reindex, delete, and chunk inspection;
- live ingest/job progress with retry and cooperative cancellation; and
- workspace usage, profile, security, and answer-service settings.

## Architecture

```text
browser
  -> Next.js web app (:3000)
     -> auth and workspace-aware proxy routes
        -> FastAPI API (private)
           -> Postgres + pgvector
           -> Redis
           -> private Azure Blob or S3-compatible object storage
           -> Celery workers
              -> Azure OpenAI Whisper transcription
              -> Modal visual embeddings
              -> ffmpeg preparation and clip/evidence processing
```

Only the Next.js web app is intended to be publicly exposed. The API, workers,
Postgres, and Redis run as internal services. Source videos and derived media
remain in private object storage and are served to the browser through
workspace-authorized media routes.

## Requirements

- Docker Desktop with Docker Compose
- `uv` for Python dependencies, migrations, tests, and the CLI
- A Modal account for the visual embedding service
- A private object-storage backend: Azure Blob or an S3-compatible service
- Azure OpenAI Whisper credentials for transcript preparation

Start configuration from [.env.example](.env.example). Keep secrets in `.env`
or the deployment secret store; never commit them.

## First-time setup

Install Python dependencies:

```bash
uv sync
```

Create local configuration:

```bash
cp .env.example .env
```

At minimum, replace the development secrets in `.env`, configure one storage
backend, and provide the transcription and answer-service settings needed by
your deployment. See:

- [Azure Blob storage](docs/AZURE-BLOB-STORAGE.md)
- [Modal credentials in Compose](docs/modal-credentials-mount.md)
- [Architecture and deployment details](ARCHITECTURE.md)

Authenticate and deploy the Modal embedder from the host:

```bash
uv run modal setup
uv run modal deploy vivadeo/modal_app.py
```

On Windows, use `PYTHONIOENCODING=utf-8` if Modal output contains an encoding
error:

```powershell
$env:PYTHONIOENCODING = "utf-8"
uv run modal deploy vivadeo/modal_app.py
```

## Run the web app

### Production-style local stack

The default Compose file uses the published API and web images, runs Alembic
migrations automatically, and starts the full worker topology:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Open [http://localhost:3000](http://localhost:3000), create an account, and
open the console. The main product routes are:

| Route | Purpose |
| --- | --- |
| `/chat` (also `/search`) | Ask questions and inspect timestamped evidence |
| `/dashboard/ingest` | Upload a file or import a URL |
| `/dashboard/library` | Browse and manage workspace videos |
| `/dashboard/jobs` and `/jobs` | Review job history and live ingest progress |
| `/dashboard/workspace` | Manage workspace members and roles |
| `/settings` | Profile, security, privacy, and answer-service settings |

Check API health from inside the stack when needed:

```bash
docker compose exec -T api curl -sS http://localhost:8000/healthz
```

Expected response:

```json
{"status":"ok"}
```

The API and worker need access to the Modal config file. Set
`VIVADEO_MODAL_CONFIG_PATH` in `.env`; the default Compose file mounts it at
`/root/.modal.toml`. On Docker Desktop for Windows, use a Docker-style path
such as `/c/Users/<you>/.modal.toml`.

### Source-mounted development stack

Use the development file when iterating on Python or Next.js source:

```bash
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up -d
```

The API runs with Uvicorn reload, the web app runs with Next.js development
mode, and source directories are bind-mounted. Python API changes reload
automatically. Restart the worker when changing code loaded by Celery:

```bash
docker compose -f docker-compose.dev.yml restart worker chat-worker evidence-worker
```

The development stack is configured for Docker-hosted Postgres and Redis. Its
source mounts are intended for local iteration; use the production-style file
when you need the complete credential-mounted deployment path.

Stop the stack with:

```bash
docker compose down
```

Do not use `docker compose down -v` unless you intentionally want to remove
the local Postgres volume and its indexed product data.

## Use the product

1. Sign up and select or create a workspace.
2. Open **Add video** and upload a local video or provide an HTTP(S) URL.
3. Follow the ingest stages from `/jobs` or job history: queued, uploading,
   chunking, transcription, embedding, indexing, and ready/failed.
4. Open **Chat**, ask a question about the archive, and select a citation to
   inspect the matching timestamp in the source video.
5. Use **Library** to inspect chunks, archive or delete a source, or reindex it.

Video ingest is asynchronous. A source becomes searchable only after its job
reaches the ready/succeeded state. URL imports require that you have the right
to use the source media.

## Configuration

`.env.example` is the authoritative list of supported settings. The main
configuration groups are:

- `DATABASE_URL`, `AUTH_DATABASE_URL`, and `REDIS_URL` for product data,
  authentication, and job transport;
- `STORAGE_BACKEND` plus the Azure or S3 connection variables for private media;
- `VIVADEO_API_KEY`, `VIVADEO_INTERNAL_SERVICE_KEY`, and
  `VIVADEO_DEFAULT_ORG_ID` for direct API/CLI and web-to-API access;
- `AZURE_OPENAI_*` for Whisper transcription;
- `VIVADEO_AUTO_LLM_*` for the server-side Vivadeo Auto answer service;
- `VIVADEO_NVIDIA_EMBEDDING_*` for optional transcript embeddings; and
- `VIVADEO_MODAL_APP`, `VIVADEO_MODAL_CLASS`, and related chunking settings for
  visual preparation.

Email verification, password reset, and verified account deletion use the
Azure Communication Services Email settings. These flows are optional for a
minimal local boot, but need valid email configuration before enabling them for
users.

## Standalone CLI and direct API mode

The Python package also includes a standalone CLI. It is separate from the
workspace web application's Postgres/object-storage index.

```bash
uv run vivadeo --help
uv run vivadeo index /path/to/video-or-directory
uv run vivadeo search "a red truck near a stop sign"
uv run vivadeo stats
uv run vivadeo remove video-name-or-path-substring
uv run vivadeo reset
```

Without `VIVADEO_API_URL`, standalone indexing uses the local CLI store under
`~/.vivadeo/db`. The CLI can also download a lightweight MP4, trim search
results, inspect its dead-letter queue, and query an API job:

```bash
uv run vivadeo download-url "https://example.com/video" --max-height 480
uv run vivadeo dlq list
uv run vivadeo job <job-id>
```

To target the running API instead of the local CLI store, configure the API
proxy and key:

```bash
export VIVADEO_API_URL=http://localhost:3000/api/proxy
export VIVADEO_API_KEY=<your-api-key>
export VIVADEO_DEFAULT_ORG_ID=<workspace-id>

uv run vivadeo index /path/to/video.mp4
uv run vivadeo search "red truck"
uv run vivadeo stats
```

In API mode, a single local file is uploaded and queued. Directory paths are
sent as mounted paths, so the directory must be visible inside the API
container (the Compose stacks mount the repository's `media/` directory at
`/media`).

## API surface

Browser code should call the Next.js `/api/*` routes. Direct API and CLI
operators authenticate with `X-API-Key` and select a workspace with
`X-Workspace-ID`.

Common protected FastAPI routes include:

- `POST /v1/videos/upload`, `/v1/videos/url`, and `/v1/videos/local-path`
- `GET /v1/videos` and `GET /v1/videos/{video_id}`
- `GET /v1/jobs/{job_id}`, `POST /v1/jobs/{job_id}/retry`, and
  `POST /v1/jobs/{job_id}/cancel`
- `POST /v1/search` and `POST /v1/search/chat`
- `POST /v1/clips` and `GET /v1/clips/{clip_id}`
- `GET /v1/stats`
- `GET /v1/media/{object_key}` for workspace-authorized media access

`GET /healthz` is the public health check. The API route definitions in
`vivadeo/api.py` are the source of truth for the complete contract.

## Development checks

Run the backend tests:

```bash
uv run pytest --cov --cov-report=term-missing
```

Run the web checks from `web/`:

```bash
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
```

For focused API iteration, use a targeted test such as:

```bash
uv run pytest tests/test_api.py::test_video_response_includes_error_and_timestamps
```

## Further documentation

- [Architecture](ARCHITECTURE.md) — runtime topology, tenancy, data flow, and
  deployment boundaries.
- [System design](SYSTEM-DESIGN.md) — deeper technical design notes.
- [Operations guide](VIVADEO.md) — service checks, API examples, and
  troubleshooting.
- [Azure Blob storage](docs/AZURE-BLOB-STORAGE.md) — private storage setup and
  verification.
- [Modal credentials mount](docs/modal-credentials-mount.md) — host and Docker
  credential setup, including Windows and WSL paths.
