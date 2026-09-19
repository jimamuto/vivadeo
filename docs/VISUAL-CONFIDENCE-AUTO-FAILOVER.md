# Visual confidence and Vivadeo Auto failover

## Summary

Vivadeo visual search now separates inexpensive candidate retrieval from
multimodal visual verification. Vivadeo Auto uses the configured OpenAI-
compatible endpoint as its primary answer and visual-verification service, with
the configured Azure OpenAI deployment as a secondary service when the primary
fails.

## Visual verification behavior

- Candidate frames are selected from visual embeddings; embeddings do not by
  themselves become visual evidence.
- Verification uses three temporally adjacent frames and requires at least two
  relevant frames before returning a verified visual moment.
- Decision thresholds are derived from the labeled examples in
  `vivadeo/visual_calibration.json`, rather than being hard-coded cutoffs.
- Final confidence combines verifier confidence, embedding similarity,
  face-pose confidence, and neighboring-frame agreement.
- Verification responses are cached by model, normalized question, and frame
  content hash.
- Visual diagnostics are persisted with the answer, including low similarity,
  disagreement, model failure, rate limiting, and unavailable-verifier states.

## Vivadeo Auto provider order

The local `.env` configures:

1. OpenAI-compatible endpoint via `VIVADEO_AUTO_LLM_API_KEY`,
   `VIVADEO_AUTO_LLM_BASE_URL`, and `VIVADEO_AUTO_LLM_MODEL`.
2. Azure OpenAI via `VIVADEO_AUTO_LLM_FALLBACK_BASE_URL` and
   `VIVADEO_AUTO_LLM_FALLBACK_MODEL`, using the existing
   `AZURE_OPENAI_API_KEY` unless an explicit
   `VIVADEO_AUTO_LLM_FALLBACK_API_KEY` is supplied.

The failover wrapper is used for both normal answer synthesis and visual
verification. The primary client retains its bounded transient retry behavior;
the secondary is attempted only after the primary operation fails.

When `.env` changes, recreate the API and worker containers so Compose reloads
the environment:

```powershell
docker compose -f docker-compose.dev.yml up -d --force-recreate api chat-worker
```

Credentials remain in `.env`, which is ignored by Git. Do not copy them into
`.env.example`, source files, logs, or client code.

Production uses the equivalent Azure Container Apps configuration. The API and
worker keep the OpenAI and JEV credentials in Container App secret references;
their environment variables contain only secret references and non-sensitive
endpoint/model settings. Apply production environment changes with Azure CLI,
then wait for the new API/worker revisions before testing.

The production database migration was run from the API Container App with:

```powershell
az containerapp exec -g rg-vivadeo -n vivadeo-api --command "alembic upgrade head"
```

## Verification

- Live `vivadeo-auto` visual query: verified two face-to-camera intervals in
  18.14 seconds.
- Live diagnostics reported `verifier: configured`, `status: verified`, and
  `neighbor_agreement: 0.667`.
- `uv run pytest -q`: 182 passed.
- `uv build`: passed.
- `node --check web/app/api/notifications/route.ts`: passed.
- Task-specific Ruff checks: passed.

## Follow-up

The calibration file is intentionally small and should grow with reviewed
positive and negative frame labels. A larger evaluation set will improve the
thresholds without changing the verification contract.
