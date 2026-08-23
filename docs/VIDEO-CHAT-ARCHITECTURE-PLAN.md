# Vivadeo Video Chat Architecture Plan

## Implementation status

The first implementation slice is now active on the `chat` branch:

- Durable `chat_thread_videos` relationships and migration `0008_chat_thread_sources`
- Chat-first multi-file upload and permitted URL ingest
- Inline job progress through the existing SSE route
- Thread source chips with remove actions and ready-state scope
- Timestamped citation player with `Watch moment`
- `Ask about this moment` context sent with the next chat request
- Library deep links that seek to the cited timestamp

Server-side exact timestamp frame extraction is now implemented with cached B2 JPEGs and worker/SSE progress. Short derived video clips and visual-model frame questioning remain a follow-up slice after frame playback is validated.

## 1. Goal

Make Chat the primary workspace for video understanding. A user should be able to attach one or more videos, watch ingest progress in the conversation, ask questions against the ready sources, and open the exact evidence moment without leaving Chat.

The existing Ingest and Library pages remain operational surfaces for batch management, retries, archive maintenance, and detailed inspection. Chat becomes the shortest path for the common workflow.

## 2. Target user experience

### Chat-first workflow

1. The user opens a thread and attaches one or more local videos or permitted URLs.
2. Chat creates the normal durable video records and ingest jobs.
3. Each source appears as a compact source chip/card in the thread with filename, status, and progress.
4. Progress is streamed through the existing job-event/SSE infrastructure. No polling-only implementation is added.
5. The user may continue composing, but questions requiring a source remain disabled or clearly marked until at least one source is ready.
6. The user asks a natural-language question.
7. Vivadeo returns a transcript-grounded answer with one or more evidence cards.
8. Each evidence card identifies the source, timestamp range, transcript excerpt, and a `Watch moment` action.
9. `Watch moment` opens an inline or side-panel player at the citation start time. It must never autoplay.
10. The user can ask a follow-up about the active source or current playback moment without reselecting the video.

### Multiple sources

A thread can contain multiple source videos. Sources are explicitly attached to a thread and can be added or removed. Search scope defaults to all ready sources attached to the thread, with an optional source filter for narrowing a question.

Every citation remains independently addressable by `video_id`, so evidence from different files can open the correct player and timestamp.

## 3. Current foundation

The repository already provides most of the backend primitives:

- `Video` records include source metadata, object keys, status, and organization ownership.
- `VideoChunk` and `VideoTranscriptSegment` preserve start/end timestamps.
- Upload, URL ingest, retry, cancel, and worker processing already create durable jobs.
- Redis-backed progress events and `/api/job-events/:jobId` provide the progress transport.
- Chat threads and messages are persisted in PostgreSQL.
- `/v1/search/chat` returns citations with `video_id`, filename, source URI, text, and timestamp ranges.
- B2 object storage and presigned video URLs are already used by video responses.
- The current Chat UI already has a source selector and renders timestamped evidence cards.

The main gap is connecting these pieces into a single source-aware conversation and providing a player/clip evidence presentation.

## 4. Data model

### 4.1 Thread sources

Add a durable join table rather than storing source IDs only in browser state:

`chat_thread_videos`

- `thread_id` — foreign key to `chat_threads`, cascade delete
- `video_id` — foreign key to `videos`, cascade/delete policy reviewed for archive behavior
- `organization_id` — tenant boundary and efficient authorization filtering
- `created_at`
- optional `removed_at` if source history/audit is needed later

Use a unique constraint on `(thread_id, video_id)`.

This supports refreshes, multiple browsers, source chips, and server-side validation. The existing `video_ids` request field remains useful as a temporary explicit override during migration, then can be replaced by server-resolved thread sources.

### 4.2 Evidence records

Keep citations attached to chat messages, but standardize their shape:

- `video_id`
- `segment_id` or chunk reference
- `start_time`
- `end_time`
- transcript text
- filename/source URI snapshot
- similarity/relevance score
- optional `frame_object_key` and `frame_url` when server frame extraction is enabled

Do not store short-lived presigned URLs in PostgreSQL. Generate them at response time.

### 4.3 Playback/frame cache

Phase 1 does not require a new table. The browser can seek the B2-backed video to a citation timestamp.

For precise still frames, add a cache keyed by `(video_id, timestamp bucket, rendition)` or store deterministic frame object keys in B2. A small metadata table can be added once extraction volume justifies it:

- `video_id`
- requested timestamp/bucket
- object key
- width/height
- created timestamp
- source video checksum/version

Invalidate frame cache when a source is replaced or reindexed from a new object.

## 5. API plan

### Thread sources

- `GET /v1/chat/threads/{thread_id}/sources`
- `POST /v1/chat/threads/{thread_id}/sources`
  - accepts one or many `video_id`s
  - validates organization ownership
  - returns source and job status
- `DELETE /v1/chat/threads/{thread_id}/sources/{video_id}`
- optionally `PATCH /v1/chat/threads/{thread_id}/sources` for ordered source lists

### Chat-first ingest

Reuse the existing upload and URL-ingest routes. Add a thread context where needed:

- upload request accepts `thread_id`
- URL ingest request accepts `thread_id`
- created video/job is attached to the thread in the same transaction as the source record
- response includes `{video_id, job_id, source, status}`

Do not create a second ingestion pipeline. Chat must call the same worker tasks, retry paths, cancellation rules, and B2 object handling as the existing Ingest page.

### Progress

Reuse `/api/job-events/:jobId` for each attached ingest job. Add a thread-level aggregation endpoint only if the UI needs one combined progress stream:

- `GET /v1/chat/threads/{thread_id}/progress`

The aggregation should derive state from existing jobs, not introduce a second progress database.

### Chat request context

The server should resolve source scope from the authenticated organization and thread:

- `thread_id`
- optional explicit `video_ids` subset, validated against thread sources
- optional `focus_video_id`
- optional `focus_start_time` and `focus_end_time` for “ask about this moment”

The backend must reject cross-workspace video IDs and must not trust source IDs supplied by the browser without authorization checks.

### Evidence playback

- `GET /v1/videos/{video_id}/playback` returns a short-lived presigned B2 URL and metadata.
- The endpoint validates workspace ownership and archived/deleted state.
- The response can include the requested citation range for the player UI.

For precise frame extraction later:

- `POST /v1/videos/{video_id}/frames` accepts timestamp(s) and returns job/cache status.
- Prefer asynchronous extraction for multiple frames or large source files.

## 6. Ingest and processing flow

1. Client selects multiple files in Chat.
2. Client uploads each file through the existing streamed B2 upload route.
3. API creates `Video`, `Job`, and `ChatThreadVideo` records transactionally.
4. Worker performs the existing stages:
   - source validation
   - transcription, when enabled
   - transcript segment persistence
   - chunking
   - embeddings
   - indexing
   - ready status
5. Worker emits the existing progress events.
6. Chat source cards update from queued → uploading → transcribing/chunking → embedding/indexing → ready or failed.
7. Failed/canceled sources expose retry/cancel actions already supported by the jobs system.
8. A ready source becomes queryable without a second selection step.

Questions should remain safe while processing is incomplete: either answer from ready sources only with an explicit status message or disable submission when no ready source exists.

## 7. Answer and evidence flow

1. Retrieve chunks only from the thread’s ready source set.
2. Attach overlapping transcript segments to retrieval hits.
3. Send the bounded evidence context to the configured Vivadeo Auto answer model.
4. Persist user and assistant messages, including citations.
5. Return citations grouped by source and ordered by relevance/time.
6. Render each citation as an evidence card with:
   - source filename
   - timestamp range
   - transcript excerpt
   - `Watch moment`
   - optional `Ask about this moment`

Do not autoplay video or render every full source inline. Use compact previews and open the larger player on demand.

## 8. Player behavior

### Phase 1: timestamp seeking

Use the existing presigned video URL with an HTML `<video>` element:

- load the correct source by `video_id`
- set `currentTime` to `start_time`
- show a small context window around the citation
- display start/end markers and transcript text
- allow the user to expand to the full Library player

This is the minimum useful version and avoids frame-generation infrastructure.

### Phase 2: evidence clips

Add a server-side clip/frame worker for exact visual evidence:

- extract a short MP4/WebM preview or JPEG frame around the cited time
- store the derived object in B2
- cache by source checksum and timestamp bucket
- return a temporary URL
- clean up or lifecycle-manage derived objects

Use FFmpeg in the worker path, not client-side manual post-processing. Keep the original source immutable.

### “Ask about this moment”

The player sends the active `video_id` and current timestamp/range with the next chat request. Retrieval searches a configurable neighborhood around that point first, then optionally broadens to the thread sources when the user asks a general follow-up.

Visual question answering can be added later by attaching the extracted frame to the model request. Transcript grounding should remain the default and fallback.

## 9. Frontend surfaces

### Chat

Add:

- multi-file attach button
- URL source action with existing permission copy
- source rail/chips above or below the composer
- per-source status/progress card
- remove-source control
- ready/failed/canceled states
- inline evidence player drawer/modal
- `Watch moment` and `Ask about this moment`
- source filter that reflects attached thread sources

### Ingest

Keep the page for:

- bulk uploads
- URL batches
- retry/cancel/history
- advanced transcription options
- operational troubleshooting

When an upload begins from Ingest, offer `Open in Chat` rather than forcing navigation.

### Library

Keep it as the canonical full-source viewer and metadata surface. It should accept `video_id` plus an optional `t`/`start_time` query parameter so Chat can deep-link directly to the cited moment.

## 10. Authorization and reliability

- Every thread source and playback request is scoped to the current organization.
- Never expose permanent B2 URLs.
- Do not allow a user to attach an archived, deleted, or foreign video.
- Treat canceled/failed jobs as non-queryable.
- Keep ingestion idempotent for retries and browser reconnects.
- Use the existing cooperative cancellation checkpoints.
- If SSE disconnects, refetch the job state once and reconnect; do not duplicate jobs.
- Keep source attachment and job creation transactionally consistent.

## 11. Rollout phases

### Phase 0 — contracts and migration

- Add `chat_thread_videos` migration/model.
- Add source schemas and authorization helpers.
- Add thread source endpoints.
- Backfill existing chat messages’ cited videos into their thread source set where possible.
- Add API tests for tenant isolation, duplicate attachment, deletion, and archived sources.

### Phase 1 — chat-first ingest

- Add multi-file attachment UI.
- Reuse upload/URL ingest routes with `thread_id`.
- Stream existing job events into source cards.
- Auto-attach ready sources.
- Preserve Ingest as a fully supported alternate entry point.
- Add frontend tests for upload, progress, retry, cancel, and source removal.

### Phase 2 — timestamped playback

- Add playback URL endpoint.
- Make citation cards clickable.
- Add player drawer with timestamp seeking.
- Add Library deep-link support.
- Add tests for citation-to-video mapping and timestamp behavior.

### Phase 3 — moment-aware conversation

- Add active playback context to chat requests.
- Add `Ask about this moment`.
- Add transcript-neighborhood retrieval and clear source context in the composer.
- Persist the active source/range in the message metadata if auditability is needed.

### Phase 4 — exact frames and clips

- Add worker-backed frame/preview extraction.
- Cache derived B2 objects.
- Add visual evidence cards.
- Evaluate visual model support separately from transcript search.

## 12. Verification plan

### Backend

- Thread source CRUD and organization isolation
- Upload/url attachment transaction behavior
- Job progress and reconnect behavior
- Ready-only retrieval enforcement
- Citation timestamps and source IDs
- Presigned playback authorization
- Frame cache invalidation
- Retry/cancel race conditions

### Frontend

- Attach one and many videos
- Source cards update through every job stage
- Failed/canceled source retry
- Chat submission with automatic source scope
- Citation opens correct source and timestamp
- Multiple citation sources render independently
- Player does not autoplay
- Ask-about-moment retains source context
- Responsive behavior and reduced-motion behavior

### Manual acceptance

- A new user can attach a video and ask a question without visiting Ingest.
- An existing user can attach a second video to the same thread.
- A citation opens the exact video at the cited moment.
- Refreshing or changing browsers preserves thread sources.
- Cross-workspace source IDs never resolve.
- Ingest page workflows continue to work unchanged.

## 13. Decisions and non-goals

- Do not replace the existing worker or create a second ingestion pipeline.
- Do not autoplay full videos in Chat.
- Do not store permanent presigned URLs.
- Do not start with visual embeddings or frame extraction before timestamp playback is working.
- Do not remove Ingest or Library; make them secondary operational surfaces.
- Keep transcript-grounded answers as the default because they are cheaper, auditable, and already supported.

## 14. Open product decisions

Before implementation, confirm:

1. Should attached sources be thread-specific only, or also become workspace-wide library assets immediately? Recommended: both; ingest creates the workspace asset and the thread relationship is separate.
2. Should a question wait for all attached sources, or search ready sources while others process? Recommended: search ready sources and clearly show pending sources.
3. Should evidence show a 10–20 second preview or the full player first? Recommended: compact preview with expand action.
4. Should users be able to ask visual questions from a frame in the first release? Recommended: no; add after timestamp playback proves the workflow.
5. Should removing a source from a thread delete it from the library? Recommended: no; remove only the relationship.
