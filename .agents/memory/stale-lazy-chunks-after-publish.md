---
name: Stale lazy chunks after publish
description: Production SPA route imports can fail when an open browser tab spans a static deployment replacement.
---

An already-open MyHomeBase SPA can retain the previous build's entry module after a publish. Navigating to a route that was not loaded before the publish requests the old build's hashed lazy chunk. The static host's catch-all SPA rewrite can return HTML for that missing JavaScript URL, causing a dynamic-import failure.

**Why:** Production client-error reports showed authenticated demo sessions succeeding before multiple lazy routes failed to fetch old hashed chunks. A hard reload immediately fixed the routes by loading the current entry module.

**How to apply:** Install a one-time handler for Vite preload errors before React renders. Prevent the default boundary failure and hard-reload once, with a session-scoped loop guard. Do not investigate demo seeding first when the client report names a failed dynamically imported module.