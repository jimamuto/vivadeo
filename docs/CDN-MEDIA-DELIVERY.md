# CDN and private media delivery

## Overview

Vivadeo uses Cloudflare in front of the production web hostname `vivadeo.jimamuto.me`, with the Azure Container App `vivadeo-web` as the origin.

The design separates public immutable assets from workspace-private media:

- Public frontend assets are cached at the Cloudflare edge.
- Signed thumbnail URLs may be cached for a short period.
- Full videos, clips, and unsigned media are never cached at the edge.
- Authorization remains workspace-scoped in the Vivadeo API.

## Signed media URLs

The API creates short-lived HMAC tokens containing the workspace ID, object key, and expiration timestamp. Tokens are signed with `INTERNAL_SERVICE_KEY`.

The media endpoint validates the signature, object key, expiry, and workspace ownership before streaming content. Invalid or expired tokens return `403`. Signed URLs are used by review, library, search evidence, thumbnails, clips, and keyframes. Tokens currently expire after five minutes and support browser range requests while valid.

Do not expose storage-provider URLs or replace the signed route with a public object URL. Keep `STORAGE_PUBLIC_ENDPOINT_URL` pointed at Vivadeo's authorized media proxy.

## Cloudflare cache policy

| Content | Edge behavior | TTL |
| --- | --- | --- |
| `/_next/static/*` | Cache | 7 days |
| `/images/*`, `/fonts/*`, favicon | Cache | 7 days |
| Signed `evidence-frames/*` and `visual-keyframes/*` | Cache | 24 hours |
| Videos, clips, unsigned media, and other media proxy paths | Bypass | No edge cache |

The static asset rule does not cache HTML or API responses. Full video caching should only be considered after measuring traffic and confirming the cache key includes authorization-safe signed URL data.

## Azure deployment setting

The production `vivadeo-api` Azure Container App is configured with exactly one replica:

- Minimum replicas: `1`
- Maximum replicas: `1`

This avoids a cold start while keeping deployment cost controlled. Increase the maximum only after measuring API concurrency and queue pressure.

## Verification

```powershell
uv run pytest tests/test_api.py -q --disable-warnings --maxfail=1
cd web
npm.cmd run build
```

For production checks, confirm that the hostname resolves to Cloudflare IPs, static assets eventually return cache `HIT`, media URLs include a signed `token`, modified or expired tokens return `403`, and video/clip responses remain uncached.

## Follow-ups

- Add automated tests for valid, expired, modified, and cross-workspace media tokens.
- Monitor Cloudflare cache `HIT`/`MISS` rates.
- Consider short-lived signed video caching only if origin bandwidth or playback latency becomes a measured bottleneck.
