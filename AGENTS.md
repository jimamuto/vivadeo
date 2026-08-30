# Vivadeo Agents Notes

Use these notes when working in this repository. Keep product behavior in `PRODUCT.md` and visual/design guidance in `DESIGN.md`; keep this file focused on agent workflow and runtime gotchas.

## Product And Design References

- Read `PRODUCT.md` before changing user-facing behavior, route contracts, workspace/auth flows, search, ingest, clips, jobs, or settings.
- Read `DESIGN.md` before changing UI, copy hierarchy, layout, color, spacing, imagery, or frontend components.
- Brand name is always `Vivadeo`.

### Chat Reference

For chat behavior, message branching, attachment lifecycle, streaming states, and conversation-management patterns, agents may consult the upstream Open WebUI repository at <https://github.com/open-webui/open-webui>. Treat it as a behavioral and architectural reference only: preserve Vivadeo's Next.js/FastAPI stack, video-first retrieval, workspace authorization, private object storage, Modal inference, and licensing/provenance guardrails documented in `docs/OPEN-WEBUI-CHAT-IMPLEMENTATION-PLAN.md`.

### Client-Facing Secrecy

Do not expose implementation vendors, model names, hosting platforms, databases, queues, storage providers, deployment details, or internal architecture in client-facing copy, labels, status messages, errors, or settings descriptions. Use product language such as `Vivadeo Auto`, `video evidence`, and `answer service`. Provider names and endpoint fields are allowed only inside explicit BYOK controls where the user is configuring their own provider. Keep implementation details in internal documentation, logs, and code only.

## Runtime Findings

- The web auth flow sends verification, reset, and deletion emails through Azure Communication Services Email using the Azure-managed sender configured in `AZURE_COMMUNICATION_CONNECTION_STRING` and `EMAIL_FROM`.
- Private media storage is provider-selectable through `STORAGE_BACKEND`; Azure Blob operations and workflow checks are documented in `docs/AZURE-BLOB-STORAGE.md`. Keep `STORAGE_PUBLIC_ENDPOINT_URL` on Vivadeo's workspace-authorized media proxy and never expose storage credentials or permanent blob URLs.
- The repo uses `uv` for Python environment management in CI. If `python` is not on PATH, run `uv sync --group test` and then `uv run pytest ...` instead of calling `python -m pytest` directly.
- Modal inference deploys are consolidated in `vivadeo/modal_app.py`; one `modal deploy vivadeo/modal_app.py` publishes Qwen embeddings, faster-whisper transcription, and Gemma answer generation. After any change to `vivadeo/modal_app.py`, automatically run Modal deploy as the verification/deploy step. On Windows, prefer `PYTHONIOENCODING=utf-8 modal deploy vivadeo/modal_app.py` because plain deploy can fail with `'charmap' codec can't encode character '\u2713'` when Modal prints checkmark/emoji characters.
- On Windows, prefer `npm.cmd` for web scripts (`npm.cmd ci`, `npm.cmd run build`) when plain `npm` does not resolve correctly from the shell.
- Local development runs with `docker-compose -f docker-compose.dev.yml up -d`. That stack bind-mounts `vivadeo/` into the API and worker containers, and API Uvicorn runs with `--reload`; Python API edits do not require rebuilding images. Restart the worker only when worker-loaded code needs refreshing; reserve image rebuilds for production-style compose or explicitly requested image verification.
- Job pages use `/api/job-events/:jobId`, a Next SSE route that polls backend `/v1/jobs/:id` and streams `job` events to the browser. The generic `/api/proxy` route still buffers responses, so SSE must not be routed through it.
- Clip studio UI is removed for the current search-chat phase; do not add new `/dashboard/clip-studio` links unless product direction changes.
- For `vivadeo/api.py`, prefer targeted `uv run pytest tests/test_api.py::...` cases while iterating, then run broader backend verification when ready.

## Common Verification Commands

- Backend tests: `uv sync --group test`, then `uv run pytest --cov --cov-report=term-missing`.
- Web dependency install on Windows: `npm.cmd ci` from `web`.
- Web production build on Windows: `npm.cmd run build` from `web`.
- API image build: `docker build -f Dockerfile -t vivadeo-api-ci-check .`.
- Web image build: `docker build -f web/Dockerfile -t vivadeo-web-ci-check ./web`.

## Persistence Rules

- User-facing profile, settings, onboarding, and workflow state must persist in PostgreSQL-backed storage. Do not use browser `localStorage` as the source of truth for these values; use local storage only for explicitly client-only conveniences such as recent-search history.

## Change Discipline

- Do not add backward-compatibility layers, fallback providers, aliases, or legacy paths unless the user explicitly requests them. Prefer removing obsolete integrations cleanly and updating all callers and documentation.
- Preserve existing route contracts called out in `PRODUCT.md`, especially search chat, job retry/cancel/SSE paths, and workspace/auth wrapper routes.
- Preserve the Vivadeo palette and layout language in `DESIGN.md`.
- Do not stage unrelated local work. This repo may have active unstaged auth, backend, or migration changes.
