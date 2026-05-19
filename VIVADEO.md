# Vivadeo Operations Guide

Vivadeo is a video semantic search service. It downloads or accepts video,
splits it into short chunks, embeds each chunk with a Modal-hosted
`Qwen/Qwen3-VL-Embedding-2B` model, stores the vectors in Postgres/pgvector, and
lets callers search the indexed video by text.

For the current service topology, tenant boundaries, and deployment model, see
`ARCHITECTURE.md`.

## What You Need

- Docker and Docker Compose.
- `uv` for Python dependency and CLI management.
- A Modal account configured on the host with `modal setup`.
- Network access from the worker container for YouTube downloads through
  `yt-dlp`.
- Network access from the host and containers to Modal.
- A `.env` file at the repo root. Start from `.env.example`.

Required environment values:

```text
SENTRYSEARCH_API_KEY=<secret API key>
SENTRYSEARCH_INTERNAL_SERVICE_KEY=<secret internal service key>
SENTRYSEARCH_DEFAULT_ORG_ID=default-workspace
DATABASE_URL=postgresql+psycopg://sentrysearch:sentrysearch@postgres:5432/sentrysearch
AUTH_DATABASE_URL=postgres://sentrysearch:sentrysearch@postgres:5432/sentrysearch
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=<secret auth signing key>
REDIS_URL=redis://redis:6379/0
S3_ENDPOINT_URL=http://minio:9000
S3_PUBLIC_ENDPOINT_URL=http://localhost:3000/api/proxy/v1/media
S3_BUCKET=sentrysearch
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_REGION=us-east-1
SENTRYSEARCH_MODAL_APP=sentrysearch-qwen3-vl-embedding-2b
SENTRYSEARCH_MODAL_CLASS=QwenEmbedder
SENTRYSEARCH_CHUNK_DURATION=30
SENTRYSEARCH_CHUNK_OVERLAP=5
SENTRYSEARCH_BATCH_SIZE=4
SENTRYSEARCH_PREPROCESS=true
SENTRYSEARCH_TARGET_RESOLUTION=480
SENTRYSEARCH_TARGET_FPS=5
SENTRYSEARCH_SKIP_STILL=false
```

Do not commit real API keys or Modal credentials.

## Services

The Docker stack runs these services:

- `web`: Next.js browser app published on host port `3000`.
- `api`: FastAPI server stays private on the Compose network.
- `worker`: Celery worker that downloads, chunks, embeds, indexes, and trims
  videos.
- `postgres`: Postgres with pgvector for video, job, clip, and embedding data.
- `redis`: Celery broker and result backend.
- `minio`: S3-compatible object storage for original videos and clips.

Modal runs the GPU embedder outside Docker:

- Modal app: `sentrysearch-qwen3-vl-embedding-2b`
- Modal class: `QwenEmbedder`
- Model: `Qwen/Qwen3-VL-Embedding-2B`
- GPU: `L40S`
- Model cache volume: `qwen3-vl-embedding-2b-cache`

## First-Time Setup

Create the environment file:

```bash
cp .env.example .env
```

Edit `SENTRYSEARCH_API_KEY` and `SENTRYSEARCH_INTERNAL_SERVICE_KEY` before exposing the stack.

Authenticate Modal if this machine has not been configured yet:

```bash
uv run modal setup
```

Deploy the Modal embedder:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run modal deploy sentrysearch/modal_app.py
```

Start the containers:

```bash
docker compose up -d
```

If images already exist and you explicitly do not want Compose to build:

```bash
docker compose up -d --no-build
```

Check container status:

```bash
docker compose ps
```

Check API health from inside the API container:

```bash
docker compose exec -T api curl -sS http://localhost:8000/healthz
```

Expected response:

```json
{"status":"ok"}
```

## Common Startup Issue

On a brand-new database, `api` and `worker` can race while creating Alembic's
version table. If the worker exits with a duplicate `alembic_version` type/table
error but the API migration completed, restart only the worker:

```bash
docker compose up -d --no-build worker
```

Then confirm the worker is running:

```bash
docker compose ps worker
docker compose logs --tail=80 worker
```

The worker log should show Celery ready and registered tasks such as:

```text
sentrysearch.ingest_url
sentrysearch.ingest_uploaded_object
sentrysearch.ingest_local_path
sentrysearch.trim_clip
```

## Ingest A YouTube Video

Queue a YouTube URL through the API:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  -d "{\"url\":\"https://youtu.be/NYSYiiqk8SY?si=ckNcsYxEo49zbs3k\",\"max_height\":480}" \
  http://localhost:8000/v1/videos/url'
```

The response contains a `job_id` and `video_id`:

```json
{
  "id": "job-id",
  "kind": "ingest_url",
  "status": "queued",
  "progress": 0.0,
  "video_id": "video-id"
}
```

Poll the job until it reaches `succeeded` or `failed`:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  http://localhost:8000/v1/jobs/<job-id>'
```

Successful completion looks like:

```json
{
  "status": "succeeded",
  "progress": 1.0,
  "message": "Indexed",
  "error": null
}
```

Verify the video is ready:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  http://localhost:8000/v1/videos/<video-id>'
```

Expected video state:

```json
{
  "status": "ready",
  "duration": 628.561,
  "object_key": "videos/..."
}
```

## Upload A Local Video

Copy a host video into the API container:

```bash
docker cp /path/to/video.mp4 vivadeo-api-1:/tmp/video.mp4
```

Upload it:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  -F "file=@/tmp/video.mp4;type=video/mp4" \
  http://localhost:8000/v1/videos/upload'
```

Poll the returned job the same way as URL ingestion.

## Query An Indexed Video

Search all indexed videos:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  -d "{\"query\":\"neovim editor setup\",\"results\":5}" \
  http://localhost:8000/v1/search'
```

Search one specific video:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  -d "{\"query\":\"neovim editor setup\",\"results\":5,\"video_id\":\"<video-id>\"}" \
  http://localhost:8000/v1/search'
```

Search results include timestamp ranges and similarity scores:

```json
{
  "results": [
    {
      "video_id": "video-id",
      "filename": "video.mp4",
      "source_uri": "https://youtu.be/...",
      "start_time": 100.0,
      "end_time": 130.0,
      "similarity_score": 0.5586
    }
  ]
}
```

## Inspect Modal Logs

Use Modal logs to confirm the remote embedder loaded and processed chunks:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run modal app logs sentrysearch-qwen3-vl-embedding-2b
```

Healthy embedding logs include lines like:

```text
Loading weights: 100%
sentrysearch: embedding video batch of 4 chunks as extracted frames
sentrysearch: embedding video chunk as single extracted frame
```

A Hugging Face warning about unauthenticated requests is not fatal, but setting
`HF_TOKEN` in the Modal environment can improve download reliability and rate
limits.

## API Endpoints

Public:

- `GET /healthz`

Protected with `X-API-Key`:

- `POST /v1/videos/upload`: upload an MP4 and queue indexing.
- `POST /v1/videos/url`: download a URL with `yt-dlp` and queue indexing.
- `POST /v1/videos/local-path`: index a path visible inside the container.
- `GET /v1/videos`: list videos.
- `GET /v1/videos/{video_id}`: fetch one video.
- `GET /v1/jobs/{job_id}`: inspect job status.
- `POST /v1/search`: search indexed chunks by text.
- `POST /v1/clips`: queue a trimmed clip.
- `GET /v1/clips/{clip_id}`: inspect one clip.
- `GET /v1/stats`: count videos and chunks.

## How Vivadeo Works

Ingestion follows this path:

```text
URL or upload
  -> FastAPI creates Video and Job records
  -> Celery worker receives the job through Redis
  -> worker downloads the source video into temporary storage
  -> worker uploads the original to MinIO
  -> ffmpeg splits the video into overlapping chunks
  -> optional preprocessing lowers resolution and frame rate
  -> worker sends chunk bytes to Modal in batches
  -> Modal extracts one representative frame per chunk
  -> Qwen3-VL produces one normalized 768-dimensional embedding per chunk
  -> worker stores vectors and timestamps in Postgres/pgvector
  -> Video becomes ready and Job becomes succeeded
```

Search follows this path:

```text
text query
  -> FastAPI sends text to the same Modal embedder
  -> Modal returns a normalized query embedding
  -> Postgres/pgvector nearest-neighbor search finds matching chunks
  -> API returns video id, filename, timestamp range, and similarity score
```

Clip creation follows this path:

```text
clip request
  -> FastAPI creates Clip and Job records
  -> Celery worker downloads the source video from MinIO
  -> ffmpeg trims the requested timestamp range
  -> worker uploads the clip to MinIO
  -> Clip becomes ready with a presigned URL
```

## Operational Checks

Check stack health:

```bash
docker compose ps
docker compose exec -T api curl -sS http://localhost:8000/healthz
```

Check worker activity:

```bash
docker compose logs --tail=120 worker
```

Check API activity:

```bash
docker compose logs --tail=120 api
```

Check indexed counts:

```bash
docker compose exec -T api sh -c 'curl -sS \
  -H "X-API-Key: $SENTRYSEARCH_API_KEY" \
  http://localhost:8000/v1/stats'
```

Stop the stack:

```bash
docker compose down
```

Stop and remove persisted Postgres and MinIO data:

```bash
docker compose down -v
```

Only use `down -v` when you intentionally want to delete indexed data and stored
objects.

## Troubleshooting

If ingestion stays at `Downloading URL`, inspect worker logs. Most failures are
network or `yt-dlp` extraction issues.

If ingestion stays at `Embedding chunk`, inspect Modal logs. Model cold starts
can take longer after a fresh deploy or cache miss.

If all chunk embeddings fail, the job should move to `failed` and dead-letter
entries are recorded in Postgres for the failed chunks.

If host `curl http://localhost:3000/healthz` fails from a sandboxed environment,
check from inside the API container instead:

```bash
docker compose exec -T api curl -sS http://localhost:8000/healthz
```

If Modal is not on `PATH`, use it through `uv`:

```bash
UV_CACHE_DIR=/tmp/uv-cache uv run modal --version
```
