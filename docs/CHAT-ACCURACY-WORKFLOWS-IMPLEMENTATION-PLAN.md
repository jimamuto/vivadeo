# Chat Accuracy Workflows — Implementation Plan

## 1. Objective

Turn Vivadeo Chat from a one-shot answer box into an evidence-first video research workspace.

The core loop is:

> **Ask → inspect evidence → correct → refine → save**

The product must distinguish between:

- what was found by retrieval,
- what was visually or transcriptually verified,
- what remains uncertain,
- and what the user has confirmed.

Accuracy is more important than returning a full result count. Weak evidence must be omitted or clearly marked instead of being presented as fact.

## 2. Current baseline

Already available:

- `/search` transcript-grounded chat surface.
- Thread persistence, branching, retry, and regeneration.
- Workspace-scoped video attachments.
- Chunk-level visual retrieval.
- Persistent five-second visual keyframes in object storage.
- Frontal/profile face-orientation metadata from the visual inference service.
- Vivadeo Pro frame verification for visual questions.
- Cached evidence-frame thumbnails and timestamp playback.
- Live job status and cancellation.

Current limitations:

- Query intent is inferred only with lightweight visual-term matching.
- Frame embeddings are still calculated at query time.
- Face orientation uses frontal/profile classification, not continuous yaw/pitch estimation.
- Visual verification is strongest on Vivadeo Pro; Auto needs an equivalent visual verifier.
- There is no user feedback loop for incorrect evidence.
- “Top matches” and “find every occurrence” are not separate search modes.
- There is no saved-search or verified-evidence object.
- Structured extraction and comparison are not first-class workflows.

## 3. Product principles

1. **Evidence before prose** — retrieve and verify moments before generating the answer.
2. **Modality must match intent** — spoken questions use transcript evidence; visual questions use frames; hybrid questions use both.
3. **No false completeness** — “2 verified moments” is better than “6 results” containing weak matches.
4. **Every claim has a time range** — answers and extracted rows link to source timestamps.
5. **Correction is a product action** — users can reject, confirm, narrow, widen, or rescope evidence without rewriting the whole question.
6. **Fast path first** — use cheap candidate retrieval, then spend compute only on a small number of candidates.
7. **Persist workspace truth server-side** — feedback, saved searches, and verified evidence belong in PostgreSQL, not browser storage.
8. **Keep the interface light** — expose confidence and controls without turning Chat into an operations console.

## 4. Target user journey

### 4.1 Ask

The user asks a natural-language question and optionally attaches or selects videos.

The system displays a small processing state:

1. Finding candidate moments
2. Checking visual/transcript evidence
3. Preparing answer

The active modality and search mode are inferred automatically, with a compact manual override when confidence is low.

### 4.2 Inspect

The response contains:

- a concise answer,
- a connected filmstrip of evidence,
- exact timestamps,
- verification state,
- and source filename.

Evidence states:

- **Verified** — passed the modality-appropriate verifier.
- **Possible match** — retrieved but not conclusively verified.
- **Insufficient evidence** — no defensible match.

### 4.3 Correct

Each evidence range supports:

- `Relevant`
- `Not relevant`
- `Show nearby`
- `Ask about this moment`

Feedback immediately updates the visible result set and is stored against the search run.

### 4.4 Refine

Suggested follow-ups should be generated from the current search, for example:

- “Only show direct eye contact.”
- “Include profile views too.”
- “Search the entire video.”
- “Exclude slides and screen recordings.”
- “Show only moments after 1:30.”

A refinement reuses the current thread and evidence context but creates a new search run, preserving earlier results.

### 4.5 Save

The user can save:

- the query,
- its scope and mode,
- verified evidence ranges,
- and any user corrections.

Saved searches can be rerun against newly ingested footage.

## 5. Workflow roadmap

### P0 — Evidence contract and correction loop

#### A. Modality-aware query routing

Create a query intent object:

```json
{
  "modality": "visual | transcript | hybrid",
  "search_mode": "top | all | focused",
  "visual_predicates": ["faces_camera"],
  "confidence": 0.94
}
```

Initial routing rules:

- Visual: face, facing, look, eye contact, show, hold, visible, wear, color, object, appear, enter, leave.
- Transcript: say, mention, explain, discuss, quote, describe verbally, what did they tell us.
- Hybrid: “What did she say while holding the product?” or questions combining an action and spoken content.

The router must be deterministic for known predicates and expose `hybrid` when both modalities are materially required.

#### B. Evidence result contract

Extend chat citations with:

```json
{
  "verification_status": "verified | possible | rejected",
  "modality": "visual | transcript | hybrid",
  "confidence": 0.91,
  "match_reason": "Speaker faces the camera",
  "start_time": 98.0,
  "end_time": 102.0
}
```

The answer generator receives only evidence allowed by the contract. Rejected evidence is never sent as supporting context.

#### C. User correction loop

Add a server-persisted feedback object:

- organization ID
- user ID
- thread ID
- message ID
- search run ID
- video ID
- evidence range
- feedback type
- optional correction text
- created timestamp

Feedback types:

- `relevant`
- `not_relevant`
- `too_early`
- `too_late`
- `wrong_modality`
- `missing_context`

Initial feedback should influence the current refinement only. Workspace-wide learning should wait until enough labeled data exists.

#### D. Ask about this moment

Clicking a filmstrip item opens a focused follow-up state:

- selected video,
- selected timestamp range,
- optional nearby context window,
- prior question visible in the thread.

The follow-up sends `focus_video_id`, `focus_start_time`, and `focus_end_time` and must not search unrelated videos unless the user explicitly expands scope.

### P1 — Search modes users strongly need

#### A. Top matches

Default mode. Return the strongest defensible moments, deduplicated into compact ranges.

Behavior:

- prioritize precision,
- stop when confidence drops below the threshold,
- never pad to the requested result count.

#### B. Find every occurrence

Explicit mode for exhaustive work.

Behavior:

- scan all keyframes in the selected scope,
- apply temporal grouping and non-maximum suppression,
- return all ranges above the verification threshold,
- show a result count and whether the scan is complete,
- run asynchronously for long videos.

UI copy should clearly distinguish:

- `Best matches`
- `Find every occurrence`

#### C. Visual/transcript mode override

Provide a compact mode control only when routing confidence is low or the user asks for it:

- Auto
- Visual
- Transcript
- Both

Do not expose implementation providers or model names.

### P1 — Comparison workflow

Allow users to select two or more videos or evidence ranges and ask comparison questions.

Examples:

- “What changed between these two recordings?”
- “Which version shows the speaker facing the camera?”
- “Compare the product demonstration.”

Pipeline:

1. Retrieve evidence independently per source.
2. Verify each source using the requested modality.
3. Align evidence ranges by topic or visual event.
4. Generate a concise difference summary.
5. Keep citations attached to each comparison claim.

The UI should use paired filmstrips or a simple left/right evidence layout, not a dense table by default.

### P1 — Structured extraction workflow

Support answer formats where rows are more useful than prose:

- claims and timestamps,
- action items,
- named people,
- product appearances,
- objections and responses,
- chapter outline,
- repeated visual events.

Response shape:

```json
{
  "format": "rows",
  "columns": ["item", "source", "timestamp", "confidence"],
  "rows": []
}
```

Every row must retain a source citation and verification state. The user can mark individual rows relevant or incorrect.

### P1 — Saved verified searches

Add a saved-search object containing:

- name,
- original query,
- modality and search mode,
- source scope,
- filters,
- verified evidence IDs,
- owner and workspace,
- last run timestamp.

Actions:

- save current search,
- rerun,
- rename,
- archive,
- export verified ranges to a brief or clip workflow later.

Do not use localStorage as the source of truth.

### P2 — Workspace learning and review queues

After enough feedback exists:

- learn workspace-specific vocabulary and visual predicates,
- prioritize previously confirmed visual patterns,
- create review queues for low-confidence evidence,
- surface repeated false-positive patterns.

This should not be built before P0 feedback data exists.

## 6. Retrieval and verification architecture

### 6.1 Ingest

Current and planned sequence:

```text
source object
  -> duration and metadata
  -> transcript segments
  -> coarse visual chunks
  -> persistent keyframes
  -> cached thumbnails
  -> frame embeddings
  -> face/orientation metadata
```

Next ingest improvements:

- Persist frame embeddings alongside keyframes.
- Prefer scene changes plus bounded sampling rather than fixed intervals alone.
- Store extraction and detector versions for reproducibility.
- Make indexing idempotent and replace old frame versions safely.

### 6.2 Query orchestration

```text
question
  -> intent router
  -> scope resolver
  -> candidate retrieval
  -> modality-specific reranking
  -> temporal grouping
  -> visual/transcript verification
  -> evidence contract
  -> answer or structured extraction
```

Candidate retrieval should remain cheap:

- transcript vector search for transcript intent,
- frame/chunk vector search for visual intent,
- both for hybrid intent.

Verification should operate only on the top candidate frames or short sequences.

### 6.3 Visual verification

For generic visual claims:

- use a multimodal verifier on actual cached frames,
- require structured relevance and confidence output,
- reject malformed or ambiguous responses.

For face orientation:

- use stored frontal/profile detection as a fast filter,
- use visual verification for final confirmation,
- add continuous head-pose landmarks only if Haar classification produces measurable false positives.

### 6.4 Temporal grouping

Group frames when:

- they belong to the same video,
- their timestamps are within the configured gap,
- and they share the same verification predicate.

Preserve the strongest frame and expand the range only to include verified neighboring frames. Do not turn one verified frame into an unverified 30-second citation.

## 7. API implementation plan

### 7.1 Chat request additions

Add optional fields:

- `modality`
- `search_mode`
- `focus_window_seconds`
- `output_format`
- `parent_search_run_id`

The server must still infer safe defaults when clients omit them.

### 7.2 Chat response additions

Add:

- `search_run_id`
- `intent`
- `search_complete`
- `verification_summary`
- citation verification fields
- optional structured `rows`
- optional `suggested_refinements`

### 7.3 Feedback routes

Proposed routes:

- `POST /v1/search/runs/{run_id}/feedback`
- `GET /v1/search/runs/{run_id}`
- `POST /v1/search/runs/{run_id}/refine`

All routes must enforce workspace ownership and source authorization.

### 7.4 Saved-search routes

Proposed routes:

- `GET /v1/search/saved`
- `POST /v1/search/saved`
- `PATCH /v1/search/saved/{id}`
- `DELETE /v1/search/saved/{id}`
- `POST /v1/search/saved/{id}/run`

## 8. Frontend implementation plan

Primary file:

- `web/app/search/search-content.tsx`

Supporting areas:

- `web/app/globals.css`
- shared API types
- thread hydration and branch normalization

Components/states to add:

1. **Evidence status label** — verified, possible, or insufficient.
2. **Evidence action menu** — relevant, not relevant, nearby, ask about this.
3. **Search mode control** — only when needed; keep compact.
4. **Refinement suggestions** — shown below the answer, not as a large card grid.
5. **Focused moment state** — selected filmstrip item becomes the scope for the next question.
6. **Exhaustive scan progress** — visible stage, percent, cancel action, and completion count.
7. **Structured result view** — accessible rows with timestamp playback.
8. **Saved-search action** — save/rerun from the current verified result.

The filmstrip remains the primary evidence surface. Do not reintroduce transcript-heavy cards or a second player for the same evidence.

## 9. Data model plan

Add only when the corresponding workflow is implemented:

### `chat_search_runs`

Stores query intent, scope, mode, completion state, and summary metrics.

### `chat_evidence_feedback`

Stores user feedback against a search run and evidence range.

### `saved_searches`

Stores reusable query definitions and workspace ownership.

### `structured_search_results`

Optional persisted rows for long-running extraction jobs. Avoid persisting transient answer rows until the extraction workflow needs replay or export.

All new tables require:

- organization foreign key,
- authorization checks,
- created/updated timestamps,
- deletion behavior aligned with thread/video deletion,
- migration and focused tests.

## 10. Job and progress workflow

Use the existing job/SSE path for long searches and exhaustive scans.

Required stages:

1. `routing` — determining modality and scope.
2. `retrieving` — finding candidate moments.
3. `checking` — verifying frames or transcript evidence.
4. `grouping` — merging adjacent matches.
5. `answering` — preparing concise response.
6. `complete` — returning verified evidence.

The chat UI should show the animated Vivadeo dots at the left of the pending assistant response, followed by the current stage message. It should not render a separate large status pill.

## 11. Evaluation plan

### 11.1 Golden set

Create labeled examples across:

- direct camera-facing,
- profile and turned-away shots,
- screen recordings and slides,
- gestures and held objects,
- color/appearance questions,
- spoken factual questions,
- hybrid visual-plus-transcript questions,
- exhaustive “find every” requests.

Start with 50–100 questions and manually labeled ranges.

### 11.2 Metrics

Track separately by modality and mode:

- precision@1 and precision@k,
- recall,
- false-positive rate,
- timestamp overlap / temporal IoU,
- verification rejection rate,
- answer claim citation coverage,
- median and p95 latency,
- cancellation success rate.

### 11.3 Patel acceptance loop

For the Patel source:

1. Reindex persistent keyframes.
2. Ask: `When does the speaker face us in this video?`
3. Confirm returned ranges against the actual video.
4. Mark false positives as not relevant.
5. Refine with `Only show direct eye contact.`
6. Run `Find every occurrence`.
7. Confirm the exhaustive result count and completion state.
8. Ask about a selected moment.
9. Save the verified search.

The workflow is accepted only when the returned ranges remain visually defensible after refinement and no transcript-only candidate is presented as visual proof.

## 12. Delivery milestones

### Milestone 1 — Evidence contract

- intent object,
- verification fields,
- verified/possible UI states,
- no weak-result padding,
- focused tests.

### Milestone 2 — Correction loop

- feedback persistence,
- relevant/not-relevant actions,
- refinement suggestions,
- current-thread reruns.

### Milestone 3 — Exhaustive search

- `top` vs `all` modes,
- asynchronous complete scan,
- temporal grouping,
- progress and cancellation.

### Milestone 4 — Focused moments and comparisons

- ask-about-moment workflow,
- paired source scope,
- comparison citations.

### Milestone 5 — Structured extraction and saved searches

- row output,
- per-row evidence feedback,
- saved-search persistence and reruns.

### Milestone 6 — Quality and learning

- golden-set dashboard,
- threshold tuning,
- workspace review queues,
- optional workspace-specific ranking.

## 13. Definition of done

The chat workflow is ready for broad user testing when:

- visual, transcript, and hybrid questions take the correct retrieval path;
- every visual claim is backed by verified frames or explicitly marked uncertain;
- “best matches” never pads results with weak candidates;
- “find every occurrence” reports complete/incomplete state;
- users can reject and refine evidence without losing prior thread context;
- selected moments support scoped follow-up questions;
- comparisons and structured rows preserve source timestamps;
- saved searches persist server-side and rerun safely;
- progress stages are visible inline with the Vivadeo dots;
- workspace authorization and provenance are preserved;
- the golden set meets agreed precision and false-positive thresholds;
- Patel validation is reproducible end to end.

## 14. Explicitly deferred

Do not implement yet:

- autonomous editing or clip generation from unverified evidence,
- workspace-wide model fine-tuning,
- continuous head-pose landmarks before Haar/visual verification metrics justify it,
- a generic agent planner,
- browser-local saved-search state as the source of truth,
- large dashboard surfaces that duplicate the chat evidence workflow.
