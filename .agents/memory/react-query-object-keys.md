---
name: React Query object keys
description: Prevent object-valued query keys from becoming invalid API paths in the shared frontend query client.
---

The shared default query function joins every query-key segment with `/`. An object-valued segment therefore becomes `[object Object]` in the request path. Queries that keep filter objects in their cache key must provide an explicit query function that serializes filters with `URLSearchParams`.

**Why:** A list request can silently hit a parameterized detail route, return a valid but differently shaped response, and make the UI appear empty even though the list API contains records.

**How to apply:** Keep structured objects in query keys for cache identity, but always define the corresponding query function and validate that list endpoints return arrays.