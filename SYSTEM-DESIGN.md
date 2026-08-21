# Vivadeo System Design

## Purpose

Vivadeo is a browser-first workspace application for semantic video search,
transcript-grounded answers, media review, ingest jobs, and clip generation.
The web application is the public boundary; storage, data processing, and
inference remain behind service boundaries.

## Runtime topology

```text
Browser
  -> Next.js web application
     -> Better Auth and authenticated proxy routes
        -> FastAPI API
           -> PostgreSQL + pgvector
           -> Redis/Celery jobs
           -> Backblaze B2 object storage
        -> Azure Communication Services Email
        -> Celery worker
           -> Backblaze B2 object storage
           -> Modal inference functions
```

PostgreSQL stores product records, workspace/auth data, jobs, clips, and vector
metadata. Redis transports asynchronous ingest and clip jobs. Modal hosts the
GPU-backed embedding, transcription, and answer-generation functions.

## Object storage

Production object storage is **Backblaze B2** accessed through its S3-compatible
API using `boto3` and Signature Version 4. The API and worker use the same
bucket and credentials through environment variables:

- `S3_ENDPOINT_URL`: regional Backblaze endpoint, for example
  `https://s3.eu-central-003.backblazeb2.com`
- `S3_BUCKET`: the Vivadeo bucket name
- `S3_ACCESS_KEY_ID`: Backblaze application key ID
- `S3_SECRET_ACCESS_KEY`: Backblaze application key
- `S3_REGION`: the B2 bucket region
- `S3_PRESIGN_SECONDS`: media URL lifetime configuration

The application stores source videos under `videos/<video-id>/` and generated
clips under `clips/<clip-id>.mp4`. Transcript artifacts use a worker-managed
object-key prefix. The API serves browser media through its authenticated
`/v1/media/{object_key}` proxy rather than exposing B2 credentials or requiring
the bucket to be public.

## Transactional email

The Next.js web application sends Better Auth transactional email through Azure
Communication Services Email. Email is not sent by FastAPI or the Celery worker.
The flow is:

```text
Better Auth event
  -> web/lib/auth.ts
  -> Azure Communication Services Email SDK
  -> Azure-managed domain sender
  -> recipient inbox
```

The sender username is `vivadeo` with display name `Vivadeo`. The sender address
uses Azure's generated `azurecomm.net` domain because the product does not yet
own a custom domain. The web container receives:

- `EMAIL_FROM`: the verified Azure MailFrom address
- `AZURE_COMMUNICATION_CONNECTION_STRING`: secret credential for the
  Communication Services resource

Verification, password-reset, and account-deletion links all use this same
provider. Azure send operations are polled to completion and failures are
surfaced; there is no alternate email provider or console fallback. See
[`docs/email.md`](docs/email.md) for provisioning and operational details.

Compose S3 settings are environment-overridable, with Backblaze B2 as the
only supported object-storage provider. The API and worker use the same
regional endpoint and credentials without changing application code.

## Media lifecycle

1. The browser submits an upload or URL-ingest request through Next.js.
2. FastAPI creates workspace-scoped video and job records.
3. Celery downloads or receives the source and writes it to Backblaze B2.
4. The worker chunks the media, sends eligible work to Modal, and stores vectors
   and transcript metadata in PostgreSQL.
5. Search returns citations and web-proxied media URLs.
6. Clip jobs download the source from B2, trim with ffmpeg, upload the clip to
   B2, and persist the clip object key.
7. Deletion removes the database records and associated B2 objects.

## Deployment and CI

GitHub Actions runs the Python test matrix, builds the API and web Docker
images, and publishes images to GHCR on pushes to `main`. The web Docker build
must copy every source directory consumed by Next.js, including
`web/styles/`, before running `npm run build`.

Production deployment pulls the published GHCR images and starts Docker Compose.
The deployment host supplies Backblaze and Azure Communication Services
credentials through its secret-managed `.env`; credentials must never be
committed to Git or embedded in images.

## Design-system foundation

The frontend token foundation lives in `web/styles/tokens.css`, with migration
guidance in `web/styles/DESIGN-SYSTEM.md`. Existing screen classes remain in
`web/app/globals.css` while future redesign work migrates them incrementally to
semantic color, spacing, typography, radius, shadow, and motion tokens.
