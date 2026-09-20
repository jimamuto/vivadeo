# CDN and private media delivery

## Overview

Vivadeo uses Cloudflare in front of the production web hostname `vivadeo.jimamuto.me`, with the Azure Container App `vivadeo-web` as the origin.

The design separates public immutable assets from workspace-private media:

- Public frontend assets are cached at the Cloudflare edge.
- Signed thumbnail and short-preview URLs may be cached for a short period.
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
| Signed `evidence-frames/*`, `visual-keyframes/*`, and `video-previews/*` | Cache | 240 seconds at the edge; 60 seconds in browsers |
| Videos, clips, unsigned media, and other media proxy paths | Bypass | No edge cache |

The static asset rule does not cache HTML or API responses. Each signed media URL remains a separate cache key, including its `token` query parameter. This preserves workspace authorization without requiring a Worker to remove the token from the cache key. The token currently expires after five minutes; the application edge TTL is deliberately four minutes so an expired token is never served from an edge cache entry.

Create these Cloudflare Cache Rules for the proxied production hostname:

1. Match `http.request.uri.path contains "/api/proxy/v1/media/evidence-frames/"` OR `http.request.uri.path contains "/api/proxy/v1/media/visual-keyframes/"` OR `http.request.uri.path contains "/api/proxy/v1/media/video-previews/"`; set **Cache eligibility: Eligible for cache**, **Edge TTL: 240 seconds**, and respect the origin Cache-Control header.
2. Match `http.request.uri.path contains "/api/proxy/v1/media/"`; set **Cache eligibility: Bypass cache**. Place this rule after the media-asset rule only if the dashboard evaluates the more-specific rule first; otherwise use the rule expression to exclude the three cacheable prefixes.
3. Leave HTML, API JSON, originals under `videos/*`, and clips under `clips/*` uncached.

The application sends `public, max-age=60, s-maxage=240, immutable` only for the three signed derived-media prefixes. All other media remains private.

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
