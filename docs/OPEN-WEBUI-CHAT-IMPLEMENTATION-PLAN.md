# Open WebUI-Informed Chat Implementation Plan

## Goal

Improve Vivadeo's chat workflow using the proven interaction patterns in [Open WebUI](https://github.com/open-webui/open-webui), while keeping Vivadeo's video-first product model, branding, workspace authorization, private object storage, PostgreSQL persistence, and Modal-hosted Vivadeo Auto inference.

This is a **behavior and architecture reference plan**, not a plan to fork Open WebUI into Vivadeo.

## Guardrails

- Keep the Vivadeo brand, Next.js frontend, FastAPI backend, PostgreSQL database, private object storage, Redis/Celery jobs, and Modal inference.
- Do not import generic model-provider, Ollama, web-search, voice, plugin, knowledge-base, or admin subsystems that do not serve video chat.
- Keep model implementation details hidden from users; the visible assistant remains **Vivadeo Auto**.
- Preserve workspace-level authorization on every thread, message, source, attachment, citation, and media request.
- Do not route chat streaming through the buffering `/api/proxy` route. Use a dedicated streaming route, as with job events.
- Do not use browser storage as the source of truth for chat state.

## Licensing and provenance

Open WebUI currently publishes an `Open WebUI License` with BSD-style conditions plus an additional restriction against removing or replacing Open WebUI branding, subject to stated exceptions. `LICENSE_HISTORY` also says that some materials retain earlier licenses.

Therefore:

1. Prefer implementing the desired behavior independently in Vivadeo using the public repository as a reference.
2. Do not copy Open WebUI frontend components, branding, or large source sections into production without a legal review.
3. If a small code section is ever reused, record its source file, commit, license, and required notices before merging it.
4. Treat this plan as an architecture/behavior comparison, not legal advice.

Reference: <https://github.com/open-webui/open-webui/blob/main/LICENSE>

## Current Vivadeo baseline

| Area | Current implementation | Plan impact |
| --- | --- | --- |
| Frontend | `web/app/chat/page.tsx` and `web/app/search/search-content.tsx` | Extend the existing Next.js chat instead of replacing it. |
| Chat API | `POST /v1/search/chat` | Preserve the route contract while adding streaming and message actions behind compatible endpoints. |
| Persistence | `ChatThread`, `ChatThreadMessage`, `ChatThreadVideo` in `vivadeo/db.py` | Add message-tree, status, and attachment metadata with additive migrations. |
| Retrieval | PostgreSQL vector search over transcript chunks | Keep retrieval video-scoped and citation-first. |
| Inference | Modal-hosted Gemma through `ModalGemmaChat` | Keep the provider private behind Vivadeo Auto. |
| Storage | Private object store | Store uploaded media and derived evidence objects behind workspace-authorized routes; never expose credentials. |
| Jobs | Redis/Celery with durable status and SSE | Reuse the same cancellation and progress conventions for chat generation. |
| Authorization | Workspace-scoped backend dependencies and Next wrappers | Every new operation must verify thread ownership through workspace membership. |

## Functionality to adopt

### P0: conversation reliability

- Edit a user message and regenerate from that point.
- Retry a failed assistant response.
- Regenerate an assistant response as a new branch rather than overwriting history.
- Navigate between alternate branches.
- Persist the active branch/current message across refreshes.
- Preserve citations independently for every assistant branch.
- Show explicit pending, generating, completed, failed, and canceled states.

### P1: conversation management

- Search threads by title and message content.
- Rename, archive, pin, and delete threads.
- Mark a thread read/unread if the UI later needs notifications.
- Add lightweight thread metadata without embedding unrelated provider data in the message body.

### P1: attachments and source context

- Attach existing workspace videos to a specific user message.
- Keep persistent thread sources for continued context.
- Track attachment readiness and ingestion status.
- Remove a message attachment without deleting the underlying video.
- Keep source/citation authorization separate from object-storage URL authorization.

### P2: response experience

- Stream generation progress and answer tokens where Modal supports it.
- Stream retrieval/citation events before the final answer when useful.
- Allow canceling an in-progress response.
- Recover a partial response after a connection drop without duplicating messages.

## Target data model

The first migration should extend the existing relational model rather than introduce Open WebUI's generic chat tables.

### `chat_threads`

Add:

- `current_message_id` — the active leaf/branch pointer.
- Optional `archived` and `pinned` flags when those controls are implemented.

### `chat_thread_messages`

Add:

- `parent_id` — nullable self-reference for message branches.
- `status` — `pending`, `streaming`, `completed`, `failed`, or `canceled`.
- `error` — nullable, user-safe failure text.
- `metadata` — JSON for generation and retrieval state that is not user-visible content.
- `updated_at` — needed for streaming updates and recovery.

Keep `content`, `role`, `citations`, and timestamps. Do not store provider-specific prompts or secrets.

### `chat_message_videos`

Add only when message-level attachments are needed:

- `id`
- `message_id`
- `video_id`
- `organization_id`
- `created_at`

Use foreign keys and a unique `(message_id, video_id)` constraint. A message attachment references a video; it does not copy or own the video object.

### Migration rules

- Add one Alembic migration per coherent schema slice.
- Backfill existing messages as root-linked, completed messages.
- Set `current_message_id` to each thread's latest message during backfill.
- Keep downgrade paths for migrations that do not destroy user data.
- Add indexes for `(thread_id, created_at)`, `(thread_id, parent_id)`, and workspace authorization lookups.

## API plan

Keep existing thread and source routes. Add explicit message operations rather than making the frontend mutate whole thread blobs.

### Existing routes to preserve

- `GET /v1/chat/threads`
- `POST /v1/chat/threads`
- `PATCH /v1/chat/threads/{thread_id}`
- `DELETE /v1/chat/threads/{thread_id}`
- Thread source list/add/remove routes
- `POST /v1/search/chat`

### Proposed routes

- `POST /v1/chat/threads/{thread_id}/messages` — create a user message and begin generation.
- `GET /v1/chat/threads/{thread_id}/messages/{message_id}` — retrieve one message state.
- `POST /v1/chat/threads/{thread_id}/messages/{message_id}/retry` — retry a failed generation.
- `POST /v1/chat/threads/{thread_id}/messages/{message_id}/regenerate` — create a sibling assistant branch.
- `POST /v1/chat/threads/{thread_id}/messages/{message_id}/edit` — create a new user branch from an edited message.
- `POST /v1/chat/threads/{thread_id}/messages/{message_id}/cancel` — cooperatively cancel generation.
- `GET /api/chat-events/{thread_id}/{message_id}` — dedicated browser SSE delivery route, or an equivalent Next route that does not buffer.

The final route names can be consolidated after the first vertical slice; the important rule is that message actions are explicit, authorized, idempotent, and branch-aware.

### Streaming event contract

Use newline-delimited SSE events with a stable event name and JSON payload:

- `message.started`
- `message.status`
- `message.delta`
- `message.citation`
- `message.completed`
- `message.failed`
- `message.canceled`
- `keepalive`

Every event includes `thread_id`, `message_id`, and a monotonically increasing sequence number. The completed event is the durable boundary; reconnecting clients use the sequence number and stored message state to avoid duplicate content.

## Frontend plan

Extend `SearchContent` or split a small chat state module from it; do not replace the existing dashboard shell or visual language.

### State model

- Keep a normalized message map keyed by message ID.
- Store `parentId`, `childrenIds`, and `currentId` in client state.
- Render the active path from the root to `currentId`.
- Keep branch navigation local to a message row.
- Hydrate from the server on thread switch and refresh.
- Treat server events as authoritative over optimistic state.

### Controls

Add progressively:

1. Retry failed response.
2. Regenerate assistant response.
3. Edit user message and branch from it.
4. Previous/next branch controls.
5. Cancel generation.
6. Thread search, pin, archive, and delete.

Controls must remain keyboard accessible, work on narrow screens, and respect reduced-motion preferences.

### Attachments

- Keep the existing multi-video upload and Browse videos flows.
- Render attachment state at the message level.
- Keep thread-level sources as persistent context; message-level attachments are evidence of what was used for that turn.
- Never make a presigned/object URL the authorization boundary.

## Backend generation flow

1. Validate the workspace, thread, user message, and attached video IDs.
2. Create a durable user message.
3. Create a pending assistant message with a sequence/version.
4. Retrieve transcript chunks only from authorized thread/request videos.
5. Emit retrieval/status events if streaming is available.
6. Call `ModalGemmaChat` through the existing Vivadeo Auto adapter.
7. Persist citations on the assistant message.
8. Mark the assistant message completed, failed, or canceled.
9. Update the thread title only once, using the existing title-generation behavior.
10. Publish the final event and close the stream.

Retries must create a new assistant attempt or branch and must not silently replace an earlier answer.

## Delivery phases

### Phase 0 — reference and contract audit

- Freeze the feature list above.
- Compare Open WebUI behavior against the current Vivadeo UI and API.
- Confirm the license/provenance decision before copying any code.
- Define event payloads and message action semantics.

**Exit criteria:** approved route/event contract and no planned dependency on Open WebUI runtime code.

### Phase 1 — message tree foundation

- Add the message metadata migration.
- Backfill existing threads.
- Add server-side branch traversal and current-message helpers.
- Add API tests for workspace isolation, branch creation, and current pointer updates.

**Exit criteria:** existing chats render unchanged and branches survive refreshes.

### Phase 2 — retry, regenerate, and edit

- Add explicit message action routes.
- Add the normalized frontend message state.
- Add branch controls and keyboard-accessible actions.
- Preserve citations and transcript evidence per branch.

**Exit criteria:** a user can edit, retry, regenerate, switch branches, and refresh without losing history.

### Phase 3 — streaming and cancellation

- Add the dedicated Next SSE route.
- Add durable assistant statuses and sequence numbers.
- Add cancel handling and reconnect/recovery behavior.
- Keep Modal provider details out of the browser payload.

**Exit criteria:** slow, failed, canceled, and disconnected generations have predictable UI and durable outcomes.

### Phase 4 — message-level attachments

- Add the message-video relation migration.
- Attach existing videos and uploaded videos to a user message.
- Enforce workspace authorization for every relation and citation.
- Add attachment removal and ingestion readiness states.

**Exit criteria:** multi-video questions identify their source videos without duplicating video records or weakening access controls.

### Phase 5 — thread management and quality

- Add search, pin, archive, unread state, and improved deletion behavior as product priorities require.
- Add browser E2E coverage for the complete workflow.
- Add load/latency checks for thread lists, message hydration, and SSE connections.
- Document operational recovery and data retention behavior.

**Exit criteria:** production-ready chat lifecycle with regression coverage.

## Verification strategy

### Backend

- Unit tests for branch traversal, current pointer updates, idempotent retries, and event sequencing.
- API tests for workspace authorization on every new route.
- Migration upgrade/backfill tests.
- Modal failure, timeout, and cancellation tests.

### Frontend

- Typecheck and production build.
- E2E tests for thread hydration, edit, retry, regenerate, branch navigation, cancellation, reconnect, and attachments.
- Responsive and reduced-motion checks.

### Operational

- Verify Postgres query plans for thread/message hydration.
- Verify Redis/SSE behavior with multiple browser tabs.
- Verify private object access remains workspace-scoped and storage credentials never reach clients.
- Verify no provider or credential details appear in user-facing responses.

## Recommended first implementation slice

Start with **Phase 1 plus retry/regenerate semantics**:

1. Add `parent_id`, `status`, `error`, `metadata`, `updated_at`, and `current_message_id`.
2. Backfill current threads as a single completed branch.
3. Add a regenerate endpoint that creates a sibling assistant message.
4. Add a retry control for failed assistant messages.
5. Add branch-aware hydration and tests.

This delivers the most valuable Open WebUI-inspired behavior without requiring a model-provider rewrite or a risky frontend replacement.
