# Vivadeo

Semantic search over video footage using a Modal-hosted
`Qwen/Qwen3-VL-Embedding-2B` service. Index videos locally, store vectors in
local ChromaDB, then search by text or image and trim matching clips.

## Architecture

```text
local videos
  -> ffmpeg chunks/preprocessing
  -> Modal remote Qwen3-VL-Embedding-2B methods
  -> local ChromaDB at ~/.vivadeo/db

text/image query
  -> same Modal remote methods
  -> ChromaDB nearest-neighbor search
  -> timestamped results / trimmed clips
```

The original Gemini, local GPU, and Tesla overlay paths have been removed. The
repo is now focused on one production path: Modal-hosted Qwen3-VL embeddings.

## Install

```bash
uv sync
```

## Deploy The Modal Embedder

Authenticate Modal first if you have not already:

```bash
modal setup
```

Deploy the Qwen3-VL-Embedding-2B remote class:

```bash
modal deploy vivadeo/modal_app.py
```

That is the only deploy step. The local CLI calls the deployed class through
the Modal Python SDK with `modal.Cls.from_name(...)`, so no web endpoint URL or
extra environment variable is needed.

The Modal app uses an `L40S` GPU by default and caches model weights in a Modal
Volume named `qwen3-vl-embedding-2b-cache`. The first embedding call after a new
deploy may take longer while the model downloads into that Volume.

## Index Footage

```bash
vivadeo index /path/to/video/footage
```

Options:

- `--chunk-duration 30`: seconds per chunk
- `--overlap 5`: overlap between chunks
- `--no-preprocess`: skip downscaling/frame-rate reduction
- `--target-resolution 480`: target height for preprocessing
- `--target-fps 5`: target frame rate for preprocessing
- `--no-skip-still`: embed still chunks too
- `--batch-size 4`: chunks per Modal embedding call
- `--retry-failed`: retry chunks recorded in the dead-letter queue

Supported video extensions: `.mp4`, `.mov`.

## Download A Video URL

Use `yt-dlp` to save a lightweight local MP4 from a supported video URL:

```bash
vivadeo download-url "https://youtu.be/..." --max-height 480
```

Save and index in one step:

```bash
vivadeo download-url "https://youtu.be/..." --index
```

Downloads are saved to `~/vivadeo_downloads` by default. Only download
videos you have the right to use.

## Search

```bash
vivadeo search "red truck running a stop sign"
```

Useful flags:

- `--results 10`: show more matches
- `--no-trim`: only show ranked results
- `--save-top 3`: trim the top three matches
- `--threshold 0.5`: adjust low-confidence prompt threshold
- `--output-dir ~/clips`: change clip output directory

## Search By Image

```bash
vivadeo img /path/to/reference.jpg
```

The image is embedded into the same retrieval space as text queries and video
chunks.

## Manage The Index

```bash
vivadeo stats
vivadeo remove video-name-or-path-substring
vivadeo reset
```

Embeddings are stored locally in:

```text
~/.vivadeo/db
```

ChromaDB stores vectors and metadata only. Original videos are not copied; the
index points back to source paths for trimming.

## Failed Chunks

Chunks that fail repeatedly during indexing are recorded in:

```text
~/.vivadeo/dlq.json
```

Inspect or clear them:

```bash
vivadeo dlq list
vivadeo dlq clear
```

## Development

```bash
uv run pytest
```

## Production Docker Stack

Vivadeo can also run as a single-node production stack with a browser-first
Next.js web app in front of FastAPI, Celery, Redis, Postgres/pgvector, and
MinIO:

```bash
cp .env.example .env
# edit API keys and BETTER_AUTH_SECRET before exposing the service
docker compose pull
docker compose up -d
```

The default `docker-compose.yml` uses prebuilt GHCR images:

- `ghcr.io/jimamuto/vivadeo-api:latest`
- `ghcr.io/jimamuto/vivadeo-web:latest`

The API and worker mount Modal credentials from `VIVADEO_MODAL_CONFIG_PATH`.
The default is `./.modal.toml`, which works on Linux, macOS, Windows, and WSL
as long as you place or copy your Modal config there. On Windows you can also
set an absolute path in `.env`, for example:

```text
VIVADEO_MODAL_CONFIG_PATH=C:\Users\you\.modal.toml
```

For local development with source mounts and hot reload:

```bash
docker compose -f docker-compose.dev.yml pull
docker compose -f docker-compose.dev.yml up
```

The dev stack runs FastAPI with `uvicorn --reload` and Next.js with
`npm run dev`, so Python API and web changes do not require rebuilding the
containers. File watching uses polling by default in dev, which is slower but
more reliable across Docker Desktop, Windows bind mounts, and WSL. The Celery
worker also sees mounted source, but still needs a container restart for code
changes to take effect.

The current production architecture is documented in `ARCHITECTURE.md`.

The web app is published on:

```text
http://localhost:3000
```

The FastAPI service stays on the Compose network. Core backend endpoints are:

- `GET /healthz`
- `POST /v1/videos/upload`
- `POST /v1/videos/url`
- `POST /v1/search`
- `POST /v1/clips`
- `GET /v1/jobs/{job_id}`
- `GET /v1/stats`

Public browser requests go through Next.js. Direct API access requires:

```text
X-API-Key: <VIVADEO_API_KEY>
```

Next.js uses `X-Internal-Service-Key` plus `X-Workspace-ID` when it proxies
backend calls. The default workspace ID is `VIVADEO_DEFAULT_ORG_ID`.
Media URLs are also served through the proxy at `/api/proxy/v1/media/...`.

To point the CLI at the production API:

```bash
export VIVADEO_API_URL=http://localhost:3000/api/proxy
export VIVADEO_API_KEY=<your-api-key>
vivadeo stats
vivadeo index /path/to/video.mp4
vivadeo search "red truck"
```

In API mode, indexing a single file uploads it to MinIO and queues an indexing
job. Directory indexing uses the container's mounted `./media:/media:ro` path,
so directory paths must be visible inside the API container.
