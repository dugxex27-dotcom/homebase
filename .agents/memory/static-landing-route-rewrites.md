---
name: Static landing route rewrites
description: Why public landing-page rewrites must not use broad path prefixes that shadow authenticated SPA routes.
---

Static marketing-page middleware must match only the exact public landing path, including its optional trailing slash. It must not rewrite every nested path under the same prefix.

**Why:** A broad contractor-path rewrite served the public marketing HTML before React loaded, so a valid nested checkout URL could never reach the authenticated router or display the server's safe rejection. App route reordering could not fix a response already replaced by pre-React middleware.

**How to apply:** When a nested route unexpectedly renders a static marketing page, inspect development/preview middleware before changing the client router. Keep public landing rewrites exact and let nested paths fall through to the SPA entry point.