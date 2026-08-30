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
           -> private object storage
        -> Azure Communication Services Email
        -> Celery worker
           -> private object storage
           -> Modal inference functions
```

PostgreSQL stores product records, workspace/auth data, jobs, clips, and vector
metadata. Redis transports asynchronous ingest and clip jobs. Modal hosts the
GPU-backed embedding, transcription, and answer-generation functions.

## Object storage

Production object storage is private Azure Blob or an S3-compatible service.
The API and worker share the provider-neutral `ObjectStore` contract and the
same backend configuration:

- `STORAGE_BACKEND`: `azure` or `s3`
- `STORAGE_PUBLIC_ENDPOINT_URL`: workspace-authorized Vivadeo media proxy
- `AZURE_STORAGE_CONNECTION_STRING`: private Azure credential
- `AZURE_STORAGE_CONTAINER`: Azure container name
- `AZURE_STORAGE_TIMEOUT`: Azure transfer timeout calibration
- `S3_ENDPOINT_URL`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
  and `S3_REGION`: settings used only by the S3 backend

The application stores source videos under `videos/<video-id>/` and generated
clips under `clips/<clip-id>.mp4`. Transcript artifacts use a worker-managed
object-key prefix. The API serves browser media through its authenticated
`/v1/media/{object_key}` proxy rather than exposing provider credentials or
requiring public objects.

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

Compose storage settings are environment-overridable. Azure Blob and
S3-compatible services use the same object keys and application workflows. The
API and worker must select the same backend and credentials.

## Media lifecycle

1. The browser submits an upload or URL-ingest request through Next.js.
2. FastAPI creates workspace-scoped video and job records.
3. Celery downloads or receives the source and writes it to private object storage.
4. The worker chunks the media, sends eligible work to Modal, and stores vectors
   and transcript metadata in PostgreSQL.
5. Search returns citations and web-proxied media URLs.
6. Clip jobs download the source, trim with ffmpeg, upload the clip to private
   object storage, and persist the clip object key.
7. Deletion removes the database records and associated private objects.

## Deployment and CI

GitHub Actions runs the Python test matrix, builds the API and web Docker
images, and publishes images to GHCR on pushes to `main`. The web Docker build
must copy every source directory consumed by Next.js, including
`web/styles/`, before running `npm run build`.

Production deployment pulls the published GHCR images and starts Docker Compose.
The deployment host supplies object-storage and Azure Communication Services
credentials through secret-managed environment configuration; credentials must never be
committed to Git or embedded in images.

## Design-system foundation

The frontend token foundation lives in `web/styles/tokens.css`, with migration
guidance in `web/styles/DESIGN-SYSTEM.md`. Existing screen classes remain in
`web/app/globals.css` while future redesign work migrates them incrementally to
semantic color, spacing, typography, radius, shadow, and motion tokens.
