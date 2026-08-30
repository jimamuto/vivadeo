# Visual Retrieval Accuracy Implementation

## Goal

Make visual questions return visually verified moments instead of treating coarse semantic matches as final evidence. Transcript retrieval remains the primary path for spoken-content questions.

## Current limitation

The current chat path retrieves video chunks with visual embeddings, then maps each hit to overlapping transcript segments before answer generation. The answer model receives transcript context, not the underlying frames. A hit therefore means "candidate moment," not "verified visual event." This is especially weak for questions about orientation, gestures, objects, and appearance.

## Target flow

```text
Ingest
  -> extract persistent keyframes with timestamps
  -> store thumbnails and frame metadata
  -> index frame-level visual embeddings

Question
  -> classify visual vs. transcript intent
  -> retrieve broad candidate chunks
  -> rerank cached frames inside candidates
  -> group adjacent matching frames into moments
  -> visually verify the top moments
  -> return only verified ranges and confidence
```

## Implementation phases

### 1. Persistent visual frame index

- Extract low-resolution keyframes during ingest, preferably using scene changes plus a bounded sampling interval.
- Persist frame timestamp, object key, width, height, and extraction version.
- Cache frame thumbnails in the existing evidence-frame/object-storage path.
- Add an idempotent frame index job so reprocessing a video does not duplicate frames.
- Keep source authorization and workspace scoping on every frame read.

### 2. Visual-query routing

Route questions containing visual predicates through the visual path. Initial predicates include:

- face, facing, look, eye contact, turn, smile, gesture, wave, hold, show
- appear, visible, see, wearing, color, object, background, enter, leave

Transcript predicates such as "what did they say," "mention," "explain," and "talk about" remain transcript-first. Ambiguous questions may run both paths, but visual verification must gate visual claims.

### 3. Frame-level reranking

- Use existing chunk retrieval for cheap candidate generation.
- Sample cached frames from each candidate chunk (and a small temporal neighborhood).
- Compare the question to individual frames or short frame sequences.
- Deduplicate nearby matches and return compact ranges rather than full chunks.
- Preserve the original video timestamp as the source of truth.

### 4. Visual verification

- Send only the top frame sequences to a multimodal verifier.
- Ask a constrained yes/no or short-label question tied to the user query.
- For "faces us," combine visual verification with face detection/head-pose estimation where available.
- Reject low-confidence candidates instead of filling the requested result count with weak matches.
- Keep transcript text as supplemental context, never as proof of a visual claim.

### 5. Response and UI contract

- Return `verified`, `confidence`, and precise start/end timestamps for visual citations.
- Mark low-confidence results as possible matches or omit them.
- The filmstrip should display verified ranges first.
- Avoid presenting transcript segments as visual evidence unless the visual check passed.
- Keep the answer concise and state when visual evidence is insufficient.

### 6. Evaluation loop

Use the Patel video as the first end-to-end fixture:

1. Confirm the video is indexed and ready.
2. Ask: `When does the speaker face us in this video?`
3. Capture returned timestamps, confidence, and evidence-frame keys.
4. Inspect each returned range against the actual video frames.
5. Record false positives and missed ranges.
6. Adjust sampling, thresholds, or verification prompts.
7. Repeat until the returned moments are visually defensible.

Then add a small labeled evaluation set covering front-facing, profile, turned-away, gestures, objects, and appearance queries. Track precision@k, recall, timestamp overlap, and false-positive rate.

## Current implementation slice

The visual loop routes visual-looking questions through frame-level retrieval. It uses chunk search to choose the top three candidates, then reads persistent five-second keyframes from object storage, embeds them, and returns de-duplicated four-second evidence windows. When using Vivadeo Pro, diverse frame candidates are individually checked by the configured vision-capable answer service; only candidates marked relevant above the confidence threshold are returned. Ingest now persists those keyframes and runs face orientation detection in the GPU-backed visual service.

## Patel object-storage validation

The end-to-end loop was run against the ready Patel source in object storage using Vivadeo Pro and the visual question `When does the speaker face us in this video?`. The loop downloaded the stored source, extracted and embedded sampled frames, individually verified diverse candidates, and returned verified windows around the opening speaker shots and `1:37-1:43`; each result is a short four-second evidence window rather than a whole 30-second chunk. The Pro answer used those verified timestamps and did not add transcript-only candidates. The full backend suite passed with 107 tests.

Residual limitation: the face detector uses frontal/profile Haar classifiers inside the GPU-backed visual service; it is not yet a continuous yaw/pitch landmark estimator. Vivadeo Auto still uses persistent visual reranking without the Pro multimodal verification step until a visual verifier is deployed for that path.

## Performance and cost guardrails

- Do not send the full video to a verifier for every question.
- Cache extracted frames and frame embeddings at ingest.
- Use chunk retrieval as the first narrowing stage.
- Verify only the top candidate ranges.
- Run verification asynchronously or progressively if latency becomes noticeable.

## Acceptance criteria

- A visual question does not rely on transcript overlap alone.
- Returned ranges point to frames that visibly support the claim.
- Adjacent duplicate ranges are merged.
- Weak candidates are omitted or labeled uncertain.
- Transcript-only questions retain current behavior.
- Patel-video verification is reproducible from a documented command or test.
- Workspace authorization and source provenance remain intact.
