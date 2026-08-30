---
name: vivadeo-api-loop
description: Run repeatable agentic smoke-test loops against Vivadeo's development APIs, including object-storage videos, ingest/reindex jobs, Pro transcript embeddings, chat generation, polling, and failure diagnosis. Use when validating a video workflow end to end, testing API routes before frontend work, investigating slow or failed chat jobs, or exercising Vivadeo Pro.
---

# Vivadeo API Loop

Use this loop before asking the user to retry a frontend workflow.

## Ground rules

- Work against the local development stack: `docker compose -f docker-compose.dev.yml ...`.
- Do not rebuild images for Python edits. `vivadeo/` is bind-mounted and API Uvicorn uses `--reload`.
- Restart `api`/`worker` only when environment variables or worker-loaded code changed.
- Never print API keys, LLM keys, database URLs, signed URLs, or full request headers.
- Use a temporary chat thread and delete it in `finally`; do not pollute a user's history.
- Record elapsed time for every stage and stop at the first actionable failure.

## End-to-end loop

1. **Confirm runtime**
   ```bash
   docker compose -f docker-compose.dev.yml ps
   ```
   Confirm API is healthy, the worker is running, and the API has the source bind mount plus `--reload`.

2. **Discover the test subject**
   Use `/v1/workspaces` and `/v1/videos` with `X-API-Key` plus `X-Workspace-ID`. Match the requested filename, then record only its `id`, `status`, `source_type`, `object_key`, and `error`.

3. **Verify object storage**
   In both API and worker containers, confirm `ObjectStore().backend` matches. In the API container, call `object_size(video.object_key)`, then request `bytes=0-1023` through `get_object` and require a 1,024-byte body plus `ContentRange`. A missing object or incorrect range is an ingest/storage failure, not a chat failure. Azure-specific provisioning and security checks live in `docs/AZURE-BLOB-STORAGE.md`; never print connection strings or provider URLs.

4. **Check Pro readiness**
   Query the database for transcript-segment count, Pro/NVIDIA embedding count, and legacy video-chunk count. A Pro video should have transcript segments and matching Pro embeddings. If embeddings are missing, call `POST /v1/videos/{id}/reindex`, then poll `GET /v1/jobs/{id}` until `succeeded`, `failed`, or `canceled`. Inspect worker logs on failure.

5. **Check provider health**
   Read the configured Pro model from runtime settings without printing credentials. Test the provider's model catalog and one minimal completion. If the configured model returns `model_not_found`, choose a model that successfully completes, update `.env`, `vivadeo/config.py`, and `.env.example`, then restart `api` and `worker` without rebuilding.

6. **Run the chat smoke test**
   - `POST /v1/chat/threads` to create a temporary thread.
   - `POST /v1/chat/threads/{thread_id}/messages` with `provider: "vivadeo-auto"`, a real question, and the discovered `video_ids`.
   - Poll `GET /v1/jobs/{job_id}` every few seconds, logging status/progress/message and elapsed time.
   - On success, fetch the thread and assert the assistant message is `completed`, non-empty, and has citations.
   - Delete the temporary thread.

## Failure diagnosis

- `500` with `fk_chat_threads_current_message`: the API updated the thread pointer before the new message row was flushed. Fix the shared append path, not the client.
- Pro job spends minutes at evidence retrieval and the video has zero Pro embeddings: reindex the object before retrying. The legacy Qwen fallback is expected but slow.
- Job reaches answer generation then returns `502`: inspect the provider response and model access. Do not expose provider errors in client copy.
- `queued` never changes: inspect Redis/worker health and task receipt before changing chat code.
- `succeeded` but no citations: verify transcript rows, embedding rows, workspace ID, and video scope; do not call it frontend-ready yet.

## Exit criteria

Call the backend workflow ready only when provider agreement, object size, and byte-range storage checks succeed; the video is `ready`; Pro embeddings exist; the temporary chat job succeeds within an observed acceptable time; the assistant answer has citations; and cleanup succeeds. Report the exact API stages, timings, changed files, and remaining risks.
