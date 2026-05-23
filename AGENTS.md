# Vivadeo Agents Notes

Use these notes when working in this repository. Keep product behavior in `PRODUCT.md` and visual/design guidance in `DESIGN.md`; keep this file focused on agent workflow and runtime gotchas.

## Product And Design References

- Read `PRODUCT.md` before changing user-facing behavior, route contracts, workspace/auth flows, search, ingest, clips, jobs, or settings.
- Read `DESIGN.md` before changing UI, copy hierarchy, layout, color, spacing, imagery, or frontend components.
- Brand name is always `Vivadeo`.

## Runtime Findings

- The web auth flow has a safe console-email fallback when `RESEND_API_KEY` is unset or placeholder text, so local and containerized sign-up and password reset flows do not need a Resend key during development.
- Docker Compose defaults should reflect that fallback instead of advertising `resend` as the default provider.
- The repo uses `uv` for Python environment management in CI. If `python` is not on PATH, run `uv sync --group test` and then `uv run pytest ...` instead of calling `python -m pytest` directly.
- On Windows, prefer `npm.cmd` for web scripts (`npm.cmd ci`, `npm.cmd run build`) when plain `npm` does not resolve correctly from the shell.
- Job pages use `/api/job-events/:jobId`, a Next SSE route that polls backend `/v1/jobs/:id` and streams `job` events to the browser. The generic `/api/proxy` route still buffers responses, so SSE must not be routed through it.
- Sandbox could not reach Docker daemon or localhost ports during validation, so container status and HTTP smoke checks may need user-side confirmation even when `docker-compose.dev.yml` is running.
- `tests/test_api.py` targeted cases passed through `uv run pytest`; full-file runs previously stalled after collection inside sandbox. Use targeted tests first when iterating on `vivadeo/api.py`, then run the broader CI command when ready.

## Common Verification Commands

- Backend tests: `uv sync --group test`, then `uv run pytest --cov --cov-report=term-missing`.
- Web dependency install on Windows: `npm.cmd ci` from `web`.
- Web production build on Windows: `npm.cmd run build` from `web`.
- API image build: `docker build -f Dockerfile -t vivadeo-api-ci-check .`.
- Web image build: `docker build -f web/Dockerfile -t vivadeo-web-ci-check ./web`.

## Change Discipline

- Preserve existing route contracts called out in `PRODUCT.md`, especially clip studio query params and job retry/cancel/SSE paths.
- Preserve the Vivadeo palette and layout language in `DESIGN.md`.
- Do not stage unrelated local work. This repo may have active unstaged auth, backend, or migration changes.
