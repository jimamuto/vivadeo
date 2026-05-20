# Vivadeo Design Assets

This folder tracks missing visual assets and placeholder content needed across the Vivadeo web app.

## Brand Rules

- Brand name: `Vivadeo`
- Palette only:
  - Grain `#D7CEC7`
  - Blackboard `#565656`
  - Oxblood `#76323F`
  - Tan `#C09F80`
- Keep UI warm, editorial, tactile, and premium.
- Avoid generic dark SaaS styling, neon accents, purple bias, glassmorphism, and default system font stacks.

## Missing Assets

### 1. Brand Identity

- `logo-wordmark`
  - Use across topbar, footer, auth, and any future marketing surfaces.
- `logo-mark`
  - Small icon for favicon, browser tabs, profile rails, and compact UI spots.
- `favicon`
  - Required for browser polish and app recognition.

### 2. Landing Page

File: `web/app/page.tsx`

Current gaps:
- Hero section uses placeholder copy instead of real artwork.
- Stats band contains placeholder art slot.
- Benefits band could use a supporting visual.
- Pricing and integration sections are text-heavy and would benefit from one or two editorial visuals.

Needed:
- `landing-hero`
  - Large editorial hero image with negative space for headline.
- `landing-support-1`
  - Secondary image or abstract product art for stats or benefits.
- `landing-support-2`
  - Optional companion visual for pricing/integration.

### 3. Auth Pages

Files:
- `web/app/sign-in/page.tsx`
- `web/app/sign-up/page.tsx`
- `web/app/forgot-password/page.tsx`
- `web/app/reset-password/page.tsx`

Current gaps:
- Auth layout has a single split-art region.
- No distinct imagery for sign-in vs sign-up vs reset flows.

Needed:
- `auth-split-panel`
  - One cinematic split visual that works across auth routes.
- `auth-variant-sign-up`
  - Optional variation with a slightly more open, welcoming composition.
- `auth-variant-reset`
  - Optional calmer variation for password reset and recovery.

### 4. Dashboard

File: `web/app/dashboard/dashboard-ui.tsx`

Current gaps:
- Dashboard uses placeholder blocks for major zones.
- No real art for upload lane, workspace view, or detail panels.
- Empty states rely on text only.

Needed:
- `dashboard-workspace-view`
  - Control-room style visual for overview hero.
- `dashboard-upload-lane`
  - Visual for ingest area and file drop zone.
- `dashboard-video-detail`
  - Visual for selected video detail surface.
- `dashboard-empty-state`
  - Intentional illustration for empty or low-data states.

### 5. Search

File: `web/app/search/page.tsx`

Current gaps:
- Search rail and result wall would benefit from more composed placeholder art.
- Image search mode needs supporting visual treatment.

Needed:
- `search-results-wall`
  - Editorial wall of ranked cards and match strips.
- `search-image-mode`
  - Visual cue for image-query flow.
- `search-empty-state`
  - Calm no-results image or abstract block.

### 6. Library

Files:
- `web/app/dashboard/library/page.tsx`
- `web/app/dashboard/dashboard-ui.tsx`

Current gaps:
- Library detail and empty states are functional but visually thin.

Needed:
- `library-archive`
  - Archival, catalog-style visual.
- `library-empty-state`
  - Placeholder for new workspace with no videos yet.
- `library-thumbnail-style`
  - Reusable still/poster crop style if real media thumbnails are added later.

### 7. Jobs

Files:
- `web/app/dashboard/jobs/page.tsx`
- `web/app/jobs/page.tsx`

Current gaps:
- Job progression is mostly structural.
- No dedicated job-stage visual language.

Needed:
- `jobs-pipeline`
  - Structured progress art showing queued to ready stages.
- `jobs-failed-state`
  - Visual for failed/canceled jobs.

### 8. Clip Studio

File: `web/app/dashboard/clip-studio/page.tsx`

Current gaps:
- Clip review and trim workflow lacks dedicated imagery.

Needed:
- `clip-studio-timeline`
  - Editorial timeline and frame-selection visual.
- `clip-studio-source-preview`
  - Source review placeholder or artwork.

### 9. Settings / Workspace

Files:
- `web/app/settings/page.tsx`
- `web/app/dashboard/workspace/page.tsx`

Current gaps:
- Settings and workspace management are mostly text and form driven.

Needed:
- `workspace-panel-art`
  - Calm organizational visual for workspace settings.
- `settings-panel-art`
  - Subtle supporting visual for account/session panels.

## Suggested Asset Prompt Set

Use Nano Banana Pro prompts in this order:

1. Landing hero
2. Auth split-panel
3. Dashboard control-room
4. Search results wall
5. Library archive
6. Jobs pipeline
7. Clip studio timeline
8. Empty state illustration
9. Avatar placeholder set
10. App icon / favicon

## Delivery Notes

- Prefer SVG or high-resolution PNG for UI art.
- Keep placeholder art reusable across routes.
- Avoid overfitting a single asset to one page if it can serve multiple surfaces.
- If real media stills become available later, replace placeholder art only where it clearly improves the product.
