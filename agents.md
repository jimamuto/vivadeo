# Vivadeo Agents Notes

## Visual Direction

- Keep UI light, warm, editorial, and tactile.
- Use only Vivadeo palette: grain `#D7CEC7`, blackboard `#565656`, oxblood `#76323F`, tan `#C09F80`.
- Brand name is always `Vivadeo`. Reference designs may use other names, but those names are never copied into product UI.
- Prefer creamy backgrounds, soft shadows, thin borders, and restrained depth.
- Typography should feel elegant but readable, with high contrast and clear hierarchy.
- Subject imagery stays placeholder-based unless real product media is explicitly needed.

## Anti-Slop Rules

- No generic dark SaaS gradients.
- No glassmorphism by default.
- No repeated identical card grids unless data demands it.
- No neon accents, purple bias, or default system font stacks.
- No extra accent colors outside grain, blackboard, oxblood, tan.
- No oversimplified "dashboard" templates that erase product character.

## Layout Rules

- Landing should feel like a premium product brochure and archive catalog.
- Dashboard should feel like a control room with distinct zones, not a flat admin page.
- Search should feel like a curated results wall with side filters and a ranked feed.
- Auth pages should feel cinematic and calm, with one strong visual split.

## Placeholder Rules

- Hero and subject imagery can be abstract placeholder blocks, collage shapes, or neutral mock art.
- Placeholders should look intentional, not like empty boxes.
- Use varied compositions so pages do not repeat the same visual language.

## Runtime Findings

- The web auth flow has a safe console-email fallback when `RESEND_API_KEY` is unset or placeholder text, so local and containerized sign-up and password reset flows do not need a Resend key during development.
- Docker Compose defaults should reflect that fallback instead of advertising `resend` as the default provider.
- The repo uses a local virtualenv at `.venv`; prefer `.venv/bin/pytest` or `python -m pytest` from that environment when the system PATH does not expose `pytest`.
- Failed ingest and clip jobs now have a real retry path at `/v1/jobs/{job_id}/retry` for supported job kinds, so the job screen can requeue work instead of only reporting failure.
- Queued/running jobs now have a cancel path at `/v1/jobs/{job_id}/cancel`. Workers check cancel state at safe checkpoints and flip related video/clip status to `canceled`, but this is cooperative cancellation, not hard process termination.
- Job pages now use `/api/job-events/:jobId`, a Next SSE route that polls backend `/v1/jobs/:id` and streams `job` events to the browser. The generic `/api/proxy` route still buffers responses, so SSE must not be routed through it.
- Retry now accepts canceled ingest jobs as well as failed ones. Ingest page surfaces recent interrupted ingest jobs (failed/canceled) and can requeue them via `/v1/jobs/{job_id}/retry`.
- Workspace roles are now app-level `owner/admin/editor/viewer`. Better Auth native `member` is normalized to `editor`, and `editor/viewer` are persisted through workspace settings overrides in `web/lib/workspace-role-overrides.ts`.
- Server enforcement now happens in two places: `/api/proxy/[...path]` blocks mutating Vivadeo API calls for `viewer`, and `/api/workspace/*` wrapper routes block invite/role mutation unless the current role is `owner` or `admin`.
- P0 product surfaces now live at `web/app/search/page.tsx`, `web/app/dashboard/library/page.tsx`, and `web/app/dashboard/jobs/page.tsx`; these pages depend on timestamp fields added to `JobResponse` and `VideoResponse`.
- Clip workflow now hands off from search results and library detail into `/dashboard/clip-studio` through query params (`video_id`, `start_time`, `end_time`), so keep that contract stable if route params change.
- Clip studio now fetches source video metadata through `/api/proxy/v1/videos/:id`, polls `/api/proxy/v1/clips/:id`, previews source media from `/api/proxy/v1/media/:object_key`, and exposes direct original/clip download links when available.
- Clip registry is client-only in `web/lib/clip-registry.ts`; library clip lists, multiple clips per source, and clip metadata edits are local browser state, not backend persistence.
- Saved and recent searches are currently client-only in `localStorage` under `vivadeo.saved-searches` and `vivadeo.recent-searches`; no server sync or workspace scoping yet.
- Search permalink support is URL-based in `/search` query params (`q`, `source`, `status`, `score`, `result`) and copy-to-clipboard only; no server-stored shared objects exist.
- Search preview now seeks the source player to the selected match start time on selection and via a `Jump to match` button. It depends on browser media seek support against `/api/proxy/v1/media/:object_key`.
- Search now supports image-query mode through `/api/proxy/v1/search/image` with multipart upload. Backend writes the uploaded image to a temp file for the embedder, then deletes it.
- Search rail now includes current workspace context plus source, status, time-range, and clip-type filters. Workspace value is derived from `vivadeo_workspace` cookie on client.
- Workspace management reads Better Auth organization data through `/api/auth/organization/list-members` and `/list-invitations`, but invite/role mutation now goes through checked `/api/workspace/*` wrappers so app-level `editor`/`viewer` overrides persist and server checks run.
- Workspace usage UI reads `/v1/stats` for `total_videos`, `total_chunks`, and `total_storage_bytes`. Throughput, failure rate, and search volume still rely on client-side activity/history signals.
- `/v1/stats` now also returns `total_storage_bytes`, computed by summing S3 object sizes for workspace video and clip object keys. Missing objects are skipped instead of failing the whole stats call.
- Dashboard usage metrics now blend `/v1/stats` with client-side activity counts from `web/lib/activity-log.ts` for ingest/search/clip metrics. Storage is backed by real object-store byte totals.
- Library detail now calls `/api/proxy/v1/videos/:id/chunks` for ordered chunk inspection. Backend route is `/v1/videos/{video_id}/chunks`, returning DB chunk rows only; no thumbnail or transcript data exists yet.
- Library detail also calls `/api/proxy/v1/videos/:id/archive`, `/reindex`, and `DELETE /api/proxy/v1/videos/:id`. Reindex clears DB chunk rows first and queues a fresh ingest job based on source type; delete removes DB rows plus stored source/clip objects when present.
- Settings session panel calls Better Auth session endpoints directly: `/api/auth/list-sessions`, `/revoke-session`, and `/revoke-other-sessions`.
- Account settings panel now calls Better Auth endpoints directly: `/api/auth/update-user`, `/change-password`, and `/send-verification-email`. The UI surfaces backend errors directly, so if route contracts differ in a future Better Auth upgrade, the panel will fail loud rather than silently.
- Forgot/reset password flows are real via `/api/auth/forgot-password` -> Better Auth `/request-password-reset` and `/api/auth/reset-password` -> Better Auth `/reset-password`.
- Email verification flow is real when `RESEND_API_KEY` is configured; sign-up redirects to `/sign-in?verify=sent` and Better Auth sends the verification email from `web/lib/auth.ts`.
- Account deletion is now enabled in Better Auth via `/api/auth/delete-user`; settings page only starts email-verified deletion request, actual delete completes through Better Auth callback link.
- Ingest UI validates `video/*`, enforces a 512 MB frontend warning limit, only allows `http/https` URL ingest, and now surfaces interrupted-ingest retry. True resumable byte-range upload is still not a separate transport-level feature.
- `/jobs` is now the dedicated ingest progress page and shows explicit stage labels for `queued`, `uploading`, `chunking`, `embedding`, `indexing`, `ready`, and `failed`, inferred from job status/message/progress.
- Dashboard ingest now supports drag-and-drop by binding dropped files back into the hidden file input with `DataTransfer`; if that browser path changes, keep click-to-browse as fallback.
- Source attribution currently means displaying `source_uri` on search results, video detail, clip preview/export surfaces, and clip lists. No richer provenance model exists yet.
- Clip collections/folders and share links are client-side only via `web/lib/clip-registry.ts` and `/dashboard/clip-studio` query params. No server-side sharing object or public embed endpoint exists.
- URL ingest UI now carries explicit permission warning copy for external media, but there is still no backend enforcement or legal-policy workflow.
- Workspace activity feed and audit log are client-side only via `web/lib/activity-log.ts`; entries are appended from UI actions like clip creation and invite/role management.
- Video tags/labels are client-side only via `web/lib/video-labels.ts`; no backend persistence or workspace sync exists for labels.
- Sandbox could not reach Docker daemon or localhost ports during validation, so container status and HTTP smoke checks were not directly verified from Codex even though user reported `docker-compose.dev.yml` is running.
- `tests/test_api.py` targeted cases passed through `.venv/bin/pytest`, but full-file run appeared to stall after collection inside sandbox; use targeted tests first when iterating on `vivadeo/api.py`.
