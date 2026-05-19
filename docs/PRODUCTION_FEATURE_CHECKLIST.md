# Vivadeo Production Feature Checklist

Purpose: track product features needed before Vivadeo feels complete for real users. This list is about functionality, UX, and workflow depth, not infra or deployment hardening.

## 1. Ingest

- [ ] Drag-and-drop upload on web app.
- [ ] Clear file validation before upload starts.
- [ ] Upload size/type warnings.
- [ ] Dedicated ingest progress page with stage labels.
- [ ] Job cancel action for queued or running work.
- [ ] Retry action for failed ingest jobs.
- [ ] Upload resume or re-try support for interrupted sessions.
- [ ] URL ingest with richer source validation.
- [ ] Better completion state after upload: ready, failed, or still processing.

## 2. Jobs

- [ ] Job detail page with full lifecycle.
- [ ] Stage-specific progress states: queued, uploading, chunking, embedding, indexing, ready, failed.
- [ ] Worker message timeline or log stream.
- [ ] Failure reasons exposed in UI.
- [ ] Job history per workspace.
- [ ] Dead-letter queue browser.
- [ ] Retry from failed job detail page.
- [ ] Webhook or push-style updates when jobs complete.

## 3. Search

- [ ] Curated results wall layout.
- [ ] Side filters for workspace, source type, time range, status, and clip type.
- [ ] Ranked feed with similarity scoring visible.
- [ ] Preview panel for selected result.
- [ ] Time-range scrub or playhead jump from result.
- [ ] Saved searches.
- [ ] Recent searches.
- [ ] Search from both text and image with consistent UX.
- [ ] Result sharing or permalink support.

## 4. Library

- [ ] Video library page with statuses, durations, and upload timestamps.
- [ ] Video detail page with source metadata.
- [ ] Search inside library.
- [ ] Archive / delete / reindex actions.
- [ ] Tags or labels on videos.
- [ ] Chunk browser for individual source video.
- [ ] Clip list per video.
- [ ] Better empty states for new workspaces.

## 5. Clips

- [ ] Create clip from search result.
- [ ] Create clip from video detail page.
- [ ] Clip preview before export.
- [ ] Multiple clips from same source.
- [ ] Clip collections or folders.
- [ ] Clip rename and metadata editing.
- [ ] Shareable clip URLs or embeds.
- [ ] Download original or generated clip from UI.

## 6. Workspaces

- [ ] Invite users to workspace.
- [ ] Role-based access control: owner, admin, editor, viewer.
- [ ] Workspace activity feed.
- [ ] Workspace-specific usage summary.
- [ ] Workspace switcher with clear current context.
- [ ] Member management UI.
- [ ] Pending invite management.

## 7. Auth And Account

- [ ] Forgot password flow.
- [ ] Email verification flow.
- [ ] Session management UI.
- [ ] Profile settings page.
- [ ] Account deletion or deactivation flow.
- [ ] Login history or active session view.

## 8. Trust And Transparency

- [ ] Source attribution visible on videos and clips.
- [ ] Source URL shown for URL ingest.
- [ ] Ingest permission warning for external media.
- [ ] Clear status badges across all surfaces.
- [ ] Audit log for meaningful product actions.

## 9. Product Metrics

- [ ] Workspace usage dashboard.
- [ ] Ingest throughput metrics.
- [ ] Search volume metrics.
- [ ] Clip creation metrics.
- [ ] Job failure metrics.
- [ ] Storage usage summary.

## 10. Prioritized Next Work

### P0

- [ ] Search results wall with filters and preview.
- [ ] Library page with video detail.
- [ ] Job detail page with retry and failure reasons.

### P1

- [ ] Clip workflow from search results.
- [ ] Workspace invites and roles.
- [ ] Saved searches.
- [ ] Source metadata and attribution.

### P2

- [ ] Webhook or push job updates.
- [ ] Collections and shared clip links.
- [ ] Usage metrics and audit log.
- [ ] Account management polish.

## Definition Of Done For A Feature

- [ ] User can discover it from main navigation.
- [ ] Empty state exists.
- [ ] Loading state exists.
- [ ] Error state exists.
- [ ] Mobile layout works.
- [ ] Access control matches workspace permissions.
- [ ] Feature has test coverage or at least an automated smoke path.
- [ ] Feature uses Vivadeo palette and visual language.

