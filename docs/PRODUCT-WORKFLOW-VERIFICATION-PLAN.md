# Vivadeo Product Workflow Verification Plan

## Goal

Verify the product workflows from the backend outward before spending time on
browser end-to-end testing. Use one known MP4 fixture in the configured private object store, the
running Compose services, and deterministic cleanup so failures are isolated,
repeatable, and cheap to diagnose.

Test fixture:

```text
videos/1dc589c5-ffd4-4975-ab3e-020b73b00d44/patel video english bad.mp4
```

The fixture is already uploaded to the configured private object store and has been verified with a
read-after-write check.

## Scope

This plan covers the current product workflows:

1. Workspace and authentication prerequisites
2. Video ingest
3. Celery job processing and live status
4. Search and search chat
5. Library and video inspection
6. Reindexing and deletion
7. Clip creation and clip retrieval
8. Media proxy delivery
9. Workspace permissions
10. Usage statistics
11. Frontend browser workflows, after backend verification passes

Out of scope for the first pass:

- Image-query UI, which is intentionally removed from the current phase
- Clip Studio as a primary workflow, which is currently removed from navigation
- Provider console behavior, because the application verifies storage through its provider-neutral adapter
- Full production account deletion against a real user account

## Test principles

- Test in dependency order: storage/database, API contracts, worker jobs, then UI.
- Reuse one fixture, but create a unique test workspace and unique object/job IDs
  per run.
- Never use production workspace data for verification.
- Never delete arbitrary objects. Cleanup must target keys and records created by
  the test run only.
- Prefer direct API assertions over browser assertions until the API workflow is
  proven.
- Capture request IDs, workspace ID, video ID, job IDs, clip ID, object keys, and
  timestamps in one run report.
- Stop on infrastructure failure. Do not continue into noisy downstream tests.

## Phase 0: Environment and container preflight

### Checks

1. Confirm the current Compose project and service set.
2. Confirm `api`, `worker`, `web`, `postgres`, and `redis` are running.
3. Confirm API health:

   ```bash
   curl http://localhost:8000/healthz
   ```

4. Confirm web health:

   ```bash
   curl -I http://localhost:3000
   ```

5. Confirm API and worker use the same database, Redis, storage backend,
   bucket, and region.
6. Confirm the running containers include the current source/image revision.
7. Confirm Modal is reachable with the configured app/class.
8. Confirm the fixture exists in private storage and record its byte size and content type.

### Pass criteria

- All required services are available.
- API health returns success.
- `ObjectStore().object_size` succeeds for the fixture.
- API and worker have compatible configuration.
- No stale container revision is used for the test run.

## Phase 1: Existing automated backend tests

Run the existing suite before touching live product data:

```bash
uv run pytest --cov --cov-report=term-missing
```

Run focused groups when iterating:

```bash
uv run pytest tests/test_config.py tests/test_store.py
uv run pytest tests/test_api.py
uv run pytest tests/test_search.py tests/test_chunker.py tests/test_trimmer.py
uv run pytest tests/test_cli_api_mode.py tests/test_downloader.py tests/test_dlq.py
```

### What this phase proves

- Request validation and response schemas
- Workspace and permission helpers
- Job state transitions at the unit/API level
- Search behavior with mocked embeddings
- Chunking and ffmpeg behavior
- CLI/API integration behavior
- Dead-letter handling

### Known limitation

These tests mock or isolate external systems. Passing this phase does not prove
that the live object store, Redis, Postgres, Celery, or Modal wiring works together.

## Phase 2: Live infrastructure smoke tests

Run cheap checks against the running services before ingesting the video.

### Private object storage

- `head_bucket` on `vivadeo`
- `head_object` on the fixture
- Upload a tiny temporary text object
- Read it back
- Delete it
- Confirm the temporary key is gone

### PostgreSQL

- Confirm migrations are applied.
- Confirm the API can create/read a workspace-scoped record.
- Confirm pgvector is available through the application connection.

### Redis/Celery

- Confirm Redis is reachable from API and worker.
- Queue a lightweight known task or inspect worker registration.
- Confirm the worker consumes a task and emits a completed result/status.

### Modal

- Run the smallest supported embedding/transcription health call if available.
- Confirm the configured remote function names resolve.
- Do not process the full fixture until storage and queue checks pass.

## Phase 3: Workspace and authorization contract tests

Create a dedicated test workspace with a unique name, then verify:

1. Workspace creation succeeds.
2. Workspace slug collision handling works.
3. Workspace settings can be read.
4. Workspace settings can be updated by an authorized role.
5. A viewer cannot mutate product data.
6. Owner/admin workspace management permissions are enforced.
7. Workspace context is preserved across API calls.
8. Test user/session credentials are isolated from any real account.

Record:

```text
organization_id
workspace_slug
owner_user_id
session identifier
```

Do not test account deletion in this phase. Use a disposable test identity if
that workflow is later enabled for verification.

## Phase 4: Real fixture ingest

Use the already-uploaded private fixture as the source of truth.

### Preferred path

Exercise the same API path the web ingest flow uses:

```text
POST /v1/videos/url or upload path
  -> Video record created
  -> Job record created
  -> Celery task queued
  -> worker downloads/processes fixture
  -> worker writes source/chunks/transcript/vector data
  -> video becomes ready
```

Use the multipart upload endpoint and keep the private fixture for storage
validation and later media tests.

### Assertions

- API returns a video ID and job ID.
- Video is assigned to the test workspace.
- Job starts in a queued/running state.
- Worker consumes the task.
- Job progresses through expected stages.
- Video reaches `ready`.
- Source object key exists in the configured private store.
- Chunk rows exist in PostgreSQL.
- Transcript data exists where Azure Whisper transcription is enabled.
- Embedding/vector data exists.
- No job dead-letter entry is created.

Persist all IDs in the run report rather than rediscovering them later.

## Phase 5: Job lifecycle verification

Use the created ingest job and a disposable clip job.

### Success path

- Read `GET /v1/jobs/{id}` until terminal state.
- Confirm progress/message/stage fields are coherent.
- Confirm the web SSE route receives the same job state later.

### Cancellation path

Use a separate controlled job if possible:

1. Create a job.
2. Cancel while queued or running.
3. Confirm cancellation is cooperative.
4. Confirm job becomes `canceled`.
5. Confirm related video/clip state is updated.

### Retry path

Use a disposable failed or canceled job:

1. Trigger or identify a supported failed/canceled job.
2. Call retry.
3. Confirm a new queued job is returned.
4. Confirm the worker can process it.

Do not intentionally corrupt the primary fixture. Use a small disposable input
for failure-path testing.

## Phase 6: Search verification

After the fixture is ready:

1. Call basic semantic search with a known phrase or visual concept from the
   video.
2. Confirm results belong to the test workspace.
3. Confirm result timestamps are valid.
4. Confirm source filename and `source_uri` are present.
5. Call transcript-grounded search chat.
6. Send a short conversation history on the follow-up turn.
7. Confirm the answer contains citations.
8. Confirm each citation maps to a real video/timestamp range.
9. Confirm empty/no-match queries return a safe response.
10. Confirm a different workspace cannot see the test result.

Search must be verified through the API before browser chat rendering is tested.

## Phase 7: Library and media verification

Using the created video ID:

1. List videos for the test workspace.
2. Fetch video detail.
3. Fetch ordered chunks.
4. Confirm source attribution.
5. Request media through `/v1/media/{object_key}`.
6. Confirm the response is authorized and has the expected content type.
7. Confirm an unauthorized workspace cannot retrieve the object.
8. Confirm missing object behavior returns a controlled 404.

This phase proves the database, private object store, API proxy, and workspace boundary together.

## Phase 8: Reindex, clip, and deletion verification

### Reindex

- Request reindex for the test video.
- Confirm old chunk rows are cleared/replaced as designed.
- Confirm a new job is queued.
- Confirm the video returns to ready state.
- Confirm the new chunks remain workspace-scoped.

### Clip

- Create a clip from a valid timestamp range.
- Confirm the clip job is queued and processed.
- Confirm ffmpeg produces a playable MP4.
- Confirm the clip object exists in the configured private store.
- Fetch clip metadata.
- Fetch the clip media URL through the API.
- Verify invalid ranges fail cleanly.

### Delete and cleanup

- Delete the test video only after all assertions pass.
- Confirm database records are removed or archived as specified.
- Confirm source and generated clip objects are removed from the configured private store.
- Confirm related jobs/metadata no longer appear in normal workspace views.
- Remove any disposable workspace/user data created by the run.

Cleanup must be idempotent and safe to rerun after partial failure.

## Phase 9: Frontend end-to-end testing

Only begin browser testing after Phases 0-8 pass.

### Auth and workspace

- Sign up a disposable user.
- Complete sign-in.
- Select the test workspace.
- Verify owner/admin/viewer permissions in the UI.
- Accept an invitation with a second disposable user.

### Ingest and jobs

- Open dashboard ingest.
- Upload the fixture or submit the supported source path.
- Verify redirect to job progress.
- Verify stage labels.
- Verify SSE updates.
- Verify retry and cancel controls.

### Search and library

- Open `/search`.
- Submit a known query.
- Verify answer, citations, timestamps, and source URI.
- Open a citation/media result.
- Open `/dashboard/library`.
- Inspect chunks and video metadata.
- Verify reindex and delete confirmations.

### Clips

- Create or open a clip through the active supported UI path.
- Verify clip readiness and media playback.
- Treat `/dashboard/clip-studio` as legacy unless product direction changes.

### Settings

- Update profile.
- Change password using a disposable account.
- Inspect/revoke sessions.
- Request verification email.
- Verify role and account-deletion UI states without deleting a real account.

## Failure diagnosis order

When a workflow fails, classify it in this order:

1. Container health/configuration
2. Database/migration/connectivity
3. Private object-store access/object state
4. Redis/Celery queue consumption
5. Modal remote function availability
6. API route/state transition
7. Next.js proxy/SSE behavior
8. Browser rendering or interaction

Do not debug the browser first when the corresponding API or job contract is
unproven.

## Timing and performance instrumentation

Every product action must record timing so correctness and speed can be analyzed
separately. Do not rely on one total workflow duration.

### Timing boundaries

Record at least these timestamps for every action:

```text
action_started_at
request_sent_at
response_received_at
action_completed_at
```

For asynchronous work, also record:

```text
job_created_at
job_queued_at (when observable)
worker_started_at
first_progress_at
terminal_state_at
```

Calculate:

```text
request_latency_ms = response_received_at - request_sent_at
client_action_ms = action_completed_at - action_started_at
queue_wait_ms = worker_started_at - job_queued_at
processing_ms = terminal_state_at - worker_started_at
e2e_job_ms = terminal_state_at - action_started_at
```

### Actions to time

At minimum, time:

- Workspace creation
- Sign-in and sign-out
- Workspace selection
- Video upload request
- URL ingest request
- Time until job appears
- Time until first job progress update
- Time in each ingest stage
- Total ingest time until `ready`
- Job cancellation response and terminal cancellation
- Job retry response and terminal completion
- Search request latency
- Search chat first response and completed response
- Citation/media proxy response latency
- Library list/detail/chunk requests
- Reindex request and reindex completion
- Clip creation request and clip completion
- Clip media download/startup
- Video deletion request and cleanup completion
- Workspace member/invitation operations
- Settings profile/password/session operations
- Dashboard initial load and key data panel loads

### Measurement rules

- Use UTC timestamps with millisecond precision.
- Use a monotonic clock for local duration calculations.
- Record server and client timing separately where possible.
- Add a `run_id` and `action_id` to every measurement.
- Record `workflow`, `action`, `route`, `job_id`, `video_id`, and `clip_id` where
  applicable.
- Record success/failure and failure classification with each timing.
- Never log credentials, session tokens, provider URLs, or raw media.
- Use the same fixture, resolution, and Modal configuration when comparing runs.
- Repeat performance-sensitive actions at least three times before drawing a
  conclusion; report median, minimum, maximum, and failures.
- Separate cold-start runs from warm-cache runs, especially for Modal and Docker.

### Timing report shape

Each action should produce a row like:

```json
{
  "run_id": "run-2026-08-21-001",
  "action_id": "ingest-01",
  "workflow": "ingest",
  "action": "wait_until_ready",
  "route": "/v1/videos/upload",
  "job_id": "redacted-id",
  "started_at": "2026-08-21T00:00:00.000Z",
  "completed_at": "2026-08-21T00:02:14.500Z",
  "duration_ms": 134500,
  "queue_wait_ms": 820,
  "processing_ms": 133100,
  "status": "success"
}
```

### Performance analysis

After each run, summarize:

- Median and p95 request latency by route.
- Median and p95 queue wait by job type.
- Median and p95 processing time by job type.
- Time spent in each ingest stage.
- Search response and answer-generation latency.
- Private object-store upload/download latency.
- Modal cold versus warm latency.
- Frontend time-to-interactive and time-to-visible-result.
- Error rate and retry rate per action.
- The slowest three actions and their likely bottlenecks.

The first performance pass should measure only. Do not optimize based on one
run or mix infrastructure changes with UI changes in the same comparison.

## Run artifacts

Each verification run should produce a compact report containing:

```text
run_id
commit_sha
container/image revisions
workspace_id
user/session identifiers (redacted)
fixture key and byte size
video_id
job_ids
clip_id
phase results
failure classification
cleanup result
```

Never include storage credentials, auth secrets, session tokens, or raw private
media URLs in the report.

## Verification execution record

The backend verification pass completed on the running development Compose
stack, excluding browser E2E by request.

### Passed

- Compose API, worker, web, PostgreSQL, and Redis services were running.
- Private fixture read, range, and metadata checks passed.
- All 99 existing backend tests passed in 38.75 seconds.
- Multipart upload reached `ready` through Celery, Azure Whisper transcription,
  and Modal embedding.
- URL ingest reached `succeeded` in approximately 258 seconds.
- Mounted local-path ingest reached `succeeded` in approximately 219 seconds.
- Search and transcript-grounded chat returned workspace-scoped results and
  citations.
- Library detail, chunks, media streaming, and storage statistics passed.
- Clip creation and media retrieval passed.
- Reindexing replaced chunks and reached `succeeded`.
- Workspace isolation returned `404` for a foreign video.
- Archive and video deletion passed; generated private objects were removed.
- Failed URL job, retry, and cancellation paths passed.
- Owner invitation creation passed.
- Viewer invitation and content mutation attempts returned `403`.
- A fresh Modal deployment with `huggingface-secret` attached produced no new
  unauthenticated Hugging Face warnings.

### Environment repair during verification

The source package and lockfile already declared
`@azure/communication-email`, but the running development `node_modules`
volume was stale. Running `npm ci` inside the web container restored the
missing dependency. Signup then returned the expected verification redirect.

### Remaining limitations

- Browser/frontend E2E remains intentionally pending.
- Real email-link verification and invite acceptance require a deliverable
  test mailbox; the signup and invitation API paths were exercised.
- Dead-letter listing was verified with no unexpected entries, while deliberate
  chunk-level DLQ generation remains a separate failure-injection test.
- Production-scale performance and repeated p95 measurements remain pending.

## Final acceptance criteria

The product is ready for frontend E2E testing when:

- All existing backend tests pass.
- All containers are healthy and on the intended revision.
- Private object-store read/write/range/delete checks pass.
- A real fixture reaches `ready` through the actual ingest path.
- Chunks, transcripts, embeddings, and source metadata are persisted.
- Search and search chat return workspace-scoped citations.
- Media proxy delivery works with authorization boundaries.
- Job retry and cancellation work on disposable jobs.
- Reindex and clip workflows complete.
- Deletion removes only test-created records and objects.
- No unresolved backend, worker, storage, or Modal failures remain.
