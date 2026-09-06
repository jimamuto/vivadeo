---
name: playwright-visual-verification
description: Reproduce and verify Vivadeo frontend behavior with Playwright, screenshots, DOM measurements, computed CSS, and repeated user flows. Use when asked to confirm something visually, inspect a screenshot mismatch, reproduce disappearing or clipped UI, test browser interactions, or verify that source CSS reached the running app.
---

# Playwright Visual Verification

Use the running development app at `http://localhost:3000`. Do not build images unless explicitly requested.

## Workflow

1. Confirm the stack with `docker compose -f docker-compose.dev.yml ps`.
2. Check whether `playwright` or `playwright-core` is already available. Do not add it to the repository solely for an investigation.
3. If absent, install it outside the repo:

   ```powershell
   $dir = Join-Path $env:TEMP "vivadeo-playwright"
   New-Item -ItemType Directory -Force -Path $dir | Out-Null
   npm.cmd install --prefix $dir playwright-core --no-save --no-audit --no-fund
   ```

4. Use installed Chrome when available:

   ```js
   const { chromium } = require("playwright-core");
   const browser = await chromium.launch({
     headless: true,
     executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
   });
   ```

5. Create a temporary user through the real sign-up UI so Better Auth creates the credential correctly. Immediately set only that test user's `email_verified` value to `TRUE` in the development PostgreSQL container, confirm the update, then sign in through the real UI. Do not wait for or retrieve a verification email. Read the container's database name and user programmatically without printing credentials. Never print passwords, connection strings, cookies, or API keys.
6. Reproduce the exact user sequence. For timing bugs, repeat the action enough times to cross the failure threshold and wait for each response to finish before continuing.
7. Capture evidence from the browser, not assumptions from source:
   - viewport screenshot
   - element `clientHeight`, `scrollHeight`, and `scrollTop`
   - `getBoundingClientRect()` positions
   - relevant `getComputedStyle()` values
   - browser console errors
   - rendered stylesheet URLs and matching compiled CSS rules when source and runtime disagree
8. Prove the diagnosis with the smallest reversible experiment, such as `page.addStyleTag()`. Do not mistake injected verification for a source fix.
9. Save temporary scripts and artifacts under `%TEMP%`, not the repository. Remove temporary threads or records when they are no longer needed unless the user asked to retain them.
10. Report the reproduction count, measured evidence, root cause, artifact paths, and whether the running app actually contains the proposed source change.

## Useful browser measurements

```js
const metrics = await page.locator(".target").evaluate((element) => ({
  clientHeight: element.clientHeight,
  scrollHeight: element.scrollHeight,
  scrollTop: element.scrollTop,
  rect: element.getBoundingClientRect().toJSON(),
  overflowY: getComputedStyle(element).overflowY,
}));
```

For scroll failures, verify all ancestors with fixed height, `min-height`, flex/grid alignment, and `overflow`. A child with `overflow-y: auto` is not scrollable unless its height is constrained.
