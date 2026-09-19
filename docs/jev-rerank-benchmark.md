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

Jev is disabled by default in the code path with `VIVADEO_JEV_ENABLED=false`; the local environment now explicitly enables it. When enabled and configured, it reranks only transcript candidates after NVIDIA/database retrieval. If the Jev request fails, Vivadeo keeps the existing retrieval order.

## Real Azure Blob video run

One 2.1 MB MP4 from the Azure Blob container was ingested through the normal Vivadeo upload and worker path. The job reached `Indexed` and produced 10 transcript segments.

Three transcript questions were evaluated against that video. The baseline was NVIDIA transcript-vector ordering; the Jev result reranked the same candidates.

| Metric | NVIDIA only | NVIDIA + Jev | Change |
|---|---:|---:|---:|
| Mean reciprocal rank | 0.778 | 0.833 | +0.056 |
| Recall@3 | 1.000 | 1.000 | 0.000 |
| Jev latency | 0 ms extra | 1,088 ms mean | +1,088 ms |

The live `/v1/search/chat` path also returned a grounded answer with one citation for the same video after Jev was enabled. This is an initial smoke benchmark, not a statistically significant quality evaluation; more labeled questions across multiple videos are needed before deciding whether the latency tradeoff is worthwhile for every search.
