# Jev reranking benchmark

Date: 2026-09-19

This is a controlled reranker benchmark, not an end-to-end video-search benchmark. The local development database contained zero videos and zero transcript chunks at test time, so there was no real Vivadeo corpus available for a corpus-level comparison.

## Setup

- Four text queries.
- Five candidate transcript snippets per query.
- The baseline preserved the existing NVIDIA retrieval order.
- The Jev path sent the same candidates to `jev-latest` as parallel relevance judgments.
- Ground-truth relevance labels were fixed before either run.
- The credential was supplied transiently for the test and was not written to disk.

## Results

| Metric | Baseline | NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.583 | 1.000 | +0.417 |
| Recall@3 | 1.000 | 1.000 | 0.000 |
| Jev request latency | 0 ms extra | 1,494 ms mean | +1,494 ms |

Jev latency range was 1,011–2,887 ms across four requests. The quality improvement is encouraging but not conclusive because the dataset is small and synthetic. The added latency is material and should be measured again against real production-shaped queries before enabling Jev by default.

## Current rollout behavior

Jev is enabled by default when a key is configured, but it is now used as an ambiguity resolver rather than a universal reranker. After NVIDIA transcript retrieval, Vivadeo compares the top two similarity scores. Jev is called only when their margin is at most `VIVADEO_JEV_MAX_SIMILARITY_MARGIN` (default `0.05`). Clear NVIDIA winners keep their original order, visual searches are unaffected, and a failed Jev request keeps the existing retrieval order.

## Real Azure Blob video run

One 2.1 MB MP4 from the Azure Blob container was ingested through the normal Vivadeo upload and worker path. The job reached `Indexed` and produced 10 transcript segments.

Three transcript questions were evaluated against that video. The baseline was NVIDIA transcript-vector ordering; the Jev result reranked the same candidates.

| Metric | NVIDIA only | NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.778 | 0.833 | +0.056 |
| Recall@3 | 1.000 | 1.000 | 0.000 |
| Jev latency | 0 ms extra | 1,088 ms mean | +1,088 ms |

The live `/v1/search/chat` path also returned a grounded answer with one citation for the same video after Jev was enabled. This is an initial smoke benchmark, not a statistically significant quality evaluation; more labeled questions across multiple videos are needed before deciding whether the latency tradeoff is worthwhile for every search.

## Expanded current run

With the ready-video inventory still containing one 28.8-second video, eight hand-labeled transcript questions were run against the same indexed evidence.

| Metric | NVIDIA only | NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.938 | 0.875 | -0.063 |
| Recall@3 | 1.000 | 1.000 | 0.000 |
| Jev latency | 0 ms extra | 1,113 ms mean | +1,113 ms |

The live chat path answered three of those questions with two citations each. One answer-service request encountered a transient rate-limit retry but completed successfully. The expanded result shows that Jev is not yet consistently more accurate; it should remain behind an evaluation flag until we have more videos and labeled questions.

## Active workspace run

The previous single-video check used the default workspace by mistake. The dashboard is using `admin-pro-workspace`, which currently has eight ready records and one long Google I/O keynote still indexing. The keynote was excluded.

Seven ready videos were tested with one timestamp-labeled question each. The questions targeted transcript facts visible in the corresponding source segments.

| Metric | NVIDIA only | NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.683 | 0.526 | -0.157 |
| Recall@3 | 0.714 | 0.571 | -0.143 |
| Jev latency | 0 ms extra | 1,033 ms mean | +1,033 ms |

In this broader run unrestricted Jev made the ranking worse: it improved two cases, tied one, and significantly demoted relevant evidence in several others. Jev is functioning and returning responses, but unrestricted reranking should not be considered an accuracy improvement. The gated follow-up below limits Jev to ambiguous retrievals.

## Gated active workspace run

The same seven active-workspace questions were rerun with the ambiguity gate enabled. The benchmark used the existing NVIDIA order whenever the top-two similarity margin exceeded `0.05`; Jev was invoked only for the three ambiguous cases (iPhone Duo, Brené Brown, and Backwards Bicycle).

| Metric | NVIDIA only | Gated NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.683 | 0.929 | +0.245 |
| Recall@3 | 0.714 | 1.000 | +0.286 |
| Jev requests | 0 | 3 / 7 queries | — |
| Jev mean latency | 0 ms | 1,058 ms/request | — |
| Added latency averaged across all queries | 0 ms | 453 ms/query | — |

This is the appropriate initial production role for Jev: preserve NVIDIA retrieval when it is decisive, and spend the extra latency only where the result is ambiguous. The result is encouraging but still based on seven labeled questions, so the benchmark should grow as more videos and evaluation questions become available.

## End-to-end chat latency run

The same authenticated browser session was used against the two-minute `teresa2min_compressed_smaller.mp4` source. These measurements include browser-visible time from submitting a question until the completed answer and citations were rendered.

| Question type | Questions | Browser latency | Result |
|---|---:|---:|---|
| Transcript, before queue/retry fixes | 3 | 19.0 s / 31.3 s / 103.5 s | Completed, but with long retry tails |
| Transcript, after fixes | 3 | 6.1 s / 10.4 s / 9.7 s | All completed with two verified moments each |

The post-fix transcript median fell from approximately 31.3 seconds to 9.7 seconds, and the mean fell from approximately 51.3 seconds to 8.7 seconds. The worker logs show chat tasks arriving on the dedicated `chat` queue; the three corresponding worker durations were 9.4 s, 6.4 s, and 6.1 s.

The changes responsible for this improvement are dedicated chat-worker routing, skipping the extra planner call for high-confidence intent, a subscribe-before-snapshot SSE fix, and capped transient answer-service backoff.

## Visual prompt smoke run

Visual prompts were then tested against the same source:

| Prompt | Browser latency | Result |
|---|---:|---|
| “When does the speaker make visible hand gestures?” | 43.6 s | Completed with one verified visual moment at 0:38–0:42 |
| “What is the speaker wearing in this video?” | 85.4 s observation window | Answer synthesis hit upstream HTTP 429 twice and the job failed with 502 |

The worker trace shows the normal visual path spending roughly 34–46 seconds between visual-evidence stages because it sequentially downloaded and embedded too many cached frames. The visual path was tightened to use two cached frames per candidate for normal searches while preserving full coverage for exhaustive searches. A grounded fallback answer was also added so verified visual citations remain usable when final answer synthesis is temporarily rate-limited.

The visual changes need another clean provider-available run before their latency improvement is treated as a benchmark result. The observed failure was an upstream answer-service rate limit, not a Jev failure.
