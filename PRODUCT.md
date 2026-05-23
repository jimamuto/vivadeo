# Vivadeo Product Notes

Vivadeo is a workspace-based video search, ingest, and clip creation product. The app centers on uploading or indexing source media, searching footage semantically, inspecting video/library metadata, trimming clips, and managing workspace activity.

## Core Product Surfaces

- P0 product surfaces live at `web/app/search/page.tsx`, `web/app/dashboard/library/page.tsx`, and `web/app/dashboard/jobs/page.tsx`.
- Landing should behave like a premium product brochure and archive catalog.
- Dashboard should behave like a control room with distinct zones, not a flat admin page.
- Search should behave like a curated results wall with side filters and a ranked feed.
- Auth pages should feel cinematic and calm, with one strong visual split.

## Auth And Workspace

- Workspace roles are app-level `owner/admin/editor/viewer`.
- Sign-up workspace creation sends the normalized email as `owner_email`; backend workspace slugs are slugified from workspace name plus email local-part, then suffixed (`-2`, `-3`, etc.) on collision so duplicate display names do not break registration.
- Better Auth native `member` is normalized to `editor`.
- `editor/viewer` role overrides persist through `web/lib/workspace-role-overrides.ts`.
- Server enforcement happens in `/api/proxy/[...path]`, which blocks mutating Vivadeo API calls for `viewer`.
- Server enforcement also happens in `/api/workspace/*` wrapper routes, which block invite/role mutation unless the current role is `owner` or `admin`.
- Workspace management reads Better Auth organization data through `/api/auth/organization/list-members` and `/list-invitations`.
- Invite and role mutation must go through checked `/api/workspace/*` wrappers so app-level overrides persist and server checks run.
- Settings session panel calls Better Auth session endpoints directly: `/api/auth/list-sessions`, `/revoke-session`, and `/revoke-other-sessions`.
- Account settings panel calls Better Auth endpoints directly: `/api/auth/update-user`, `/change-password`, and `/send-verification-email`.
- Forgot/reset password flows are real via `/api/auth/forgot-password` to Better Auth `/request-password-reset`, and `/api/auth/reset-password` to Better Auth `/reset-password`.
- Email verification is real when `RESEND_API_KEY` is configured; sign-up redirects to `/sign-in?verify=sent`.
- Account deletion is enabled through Better Auth `/api/auth/delete-user`; settings only starts the email-verified deletion request, and actual deletion completes through the callback link.

## Search

- Search is moving to a transcript-grounded chat surface on `/search`.
- Search chat sends conversation history to backend `/v1/search/chat` through `/api/proxy/v1/search/chat`.
- Search chat retrieves relevant video chunks, attaches overlapping transcript segments, and asks Modal-hosted Gemma E4B through Modal remote functions, not HTTP model endpoints.
- Search answers return transcript citations with video filename, source URI, and timestamp ranges.
- Search is text-only for the current phase; image-query UI is intentionally removed until a later phase.
- Recent searches are client-only in `localStorage` under `vivadeo.recent-searches`; there is no server sync or workspace scoping yet.
- Workspace value in search is derived from the `vivadeo_workspace` cookie on the client.

## Ingest And Jobs

- Failed ingest and clip jobs have a retry path at `/v1/jobs/{job_id}/retry` for supported job kinds.
- Retry accepts canceled ingest jobs as well as failed ones.
- Ingest page surfaces recent interrupted ingest jobs, including failed and canceled jobs, and can requeue them through `/v1/jobs/{job_id}/retry`.
- Queued/running jobs have a cancel path at `/v1/jobs/{job_id}/cancel`.
- Workers check cancel state at safe checkpoints and flip related video/clip status to `canceled`; cancellation is cooperative, not hard process termination.
- `/jobs` is the dedicated ingest progress page and shows explicit stage labels for `queued`, `uploading`, `chunking`, `embedding`, `indexing`, `ready`, and `failed`.
- Job stage labels are inferred from job status, message, and progress.
- Dashboard ingest supports drag-and-drop by binding dropped files back into the hidden file input with `DataTransfer`; keep click-to-browse as fallback.
- Ingest UI validates `video/*`, enforces a 512 MB frontend warning limit, and only allows `http/https` URL ingest.
- URL ingest UI carries explicit permission warning copy for external media, but there is no backend enforcement or legal-policy workflow yet.
- True resumable byte-range upload is not a separate transport-level feature yet.

## Clips

- Clip studio UI is removed for the current phase while `/search` becomes a transcript-grounded chat surface.
- Backend clip APIs and stored clip objects may still exist for compatibility, but the product no longer links users into `/dashboard/clip-studio`.
- Future clip extraction should use answer citation ranges as evidence, but this is not active yet.
- Clip registry remains client-only in `web/lib/clip-registry.ts` for legacy local clip metadata.
- There is no server-side sharing object or public embed endpoint yet.

## Library And Usage

- Source attribution currently means displaying `source_uri` on search results, video detail, clip preview/export surfaces, and clip lists.
- No richer provenance model exists yet.
- Workspace usage UI reads `/v1/stats` for `total_videos`, `total_chunks`, and `total_storage_bytes`.
- `/v1/stats` computes `total_storage_bytes` by summing S3 object sizes for workspace video and clip object keys.
- Missing objects are skipped instead of failing the whole stats call.
- Throughput, failure rate, and search volume still rely on client-side activity/history signals.
- Dashboard usage metrics blend `/v1/stats` with client-side activity counts from `web/lib/activity-log.ts`.
- Library detail calls `/api/proxy/v1/videos/:id/chunks` for ordered chunk inspection.
- Backend route `/v1/videos/{video_id}/chunks` returns DB chunk rows only; no thumbnail or transcript data exists yet.
- Library detail calls `/api/proxy/v1/videos/:id/archive`, `/reindex`, and `DELETE /api/proxy/v1/videos/:id`.
- Reindex clears DB chunk rows first and queues a fresh ingest job based on source type.
- Delete removes DB rows plus stored source/clip objects when present.
- Workspace activity feed and audit log are client-side only through `web/lib/activity-log.ts`.
- Activity entries are appended from UI actions like clip creation and invite/role management.
- Video tags/labels are client-side only through `web/lib/video-labels.ts`; no backend persistence or workspace sync exists for labels.
