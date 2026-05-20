# Vivadeo Production Feature Checklist

Purpose: track product features needed before Vivadeo feels complete for real users. This list is about functionality, UX, and workflow depth, not infra or deployment hardening.

## 1. Ingest

- [x] Drag-and-drop upload on web app.
- [x] Clear file validation before upload starts.
- [x] Upload size/type warnings.
- [x] Dedicated ingest progress page with stage labels.
- [x] Job cancel action for queued or running work.
- [x] Retry action for failed ingest jobs.
- [x] Upload resume or re-try support for interrupted sessions.
- [x] URL ingest with richer source validation.
- [x] Better completion state after upload: ready, failed, or still processing.

## 2. Jobs

- [x] Job detail page with full lifecycle.
- [x] Stage-specific progress states: queued, uploading, chunking, embedding, indexing, ready, failed.
- [x] Worker message timeline or log stream.
- [x] Failure reasons exposed in UI.
- [x] Job history per workspace.
- [x] Dead-letter queue browser.
- [x] Retry from failed job detail page.
- [x] Webhook or push-style updates when jobs complete.

## 3. Search

- [x] Curated results wall layout.
- [x] Side filters for workspace, source type, time range, status, and clip type.
- [x] Ranked feed with similarity scoring visible.
- [x] Preview panel for selected result.
- [x] Time-range scrub or playhead jump from result.
- [x] Saved searches.
- [x] Recent searches.
- [x] Search from both text and image with consistent UX.
- [x] Result sharing or permalink support.

## 4. Library

- [x] Video library page with statuses, durations, and upload timestamps.
- [x] Video detail page with source metadata.
- [x] Search inside library.
- [x] Archive / delete / reindex actions.
- [x] Tags or labels on videos.
- [x] Chunk browser for individual source video.
- [x] Clip list per video.
- [x] Better empty states for new workspaces.

## 5. Clips

- [x] Create clip from search result.
- [x] Create clip from video detail page.
- [x] Clip preview before export.
- [x] Multiple clips from same source.
- [x] Clip collections or folders.
- [x] Clip rename and metadata editing.
- [x] Shareable clip URLs or embeds.
- [x] Download original or generated clip from UI.

## 6. Workspaces

- [x] Invite users to workspace.
- [x] Role-based access control: owner, admin, editor, viewer.
- [x] Workspace activity feed.
- [x] Workspace-specific usage summary.
- [x] Workspace switcher with clear current context.
- [x] Member management UI.
- [x] Pending invite management.

## 7. Auth And Account

- [x] Forgot password flow.
- [x] Email verification flow.
- [x] Session management UI.
- [x] Profile settings page.
- [x] Account deletion or deactivation flow.
- [x] Login history or active session view.

## 8. Trust And Transparency

- [x] Source attribution visible on videos and clips.
- [x] Source URL shown for URL ingest.
- [x] Ingest permission warning for external media.
- [x] Clear status badges across all surfaces.
- [x] Audit log for meaningful product actions.

## 9. Product Metrics

- [x] Workspace usage dashboard.
- [x] Ingest throughput metrics.
- [x] Search volume metrics.
- [x] Clip creation metrics.
- [x] Job failure metrics.
- [x] Storage usage summary.

## 10. Prioritized Next Work

### P0

- [x] Search results wall with filters and preview.
- [x] Library page with video detail.
- [x] Job detail page with retry and failure reasons.

### P1

- [x] Clip workflow from search results.
- [x] Workspace invites and roles.
- [x] Saved searches.
- [x] Source metadata and attribution.

### P2

- [x] Webhook or push job updates.
- [x] Collections and shared clip links.
- [x] Usage metrics and audit log.
- [x] Account management polish.

## Definition Of Done For A Feature

- [x] User can discover it from main navigation.
- [x] Empty state exists.
- [x] Loading state exists.
- [x] Error state exists.
- [x] Mobile layout works.
- [x] Access control matches workspace permissions.
- [x] Feature has test coverage or at least an automated smoke path.
- [x] Feature uses Vivadeo palette and visual language.
