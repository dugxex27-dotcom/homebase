---
name: Wouter query parameters
description: Query-driven views must use Wouter's query-aware hook, not pathname state.
---

Use `useSearch()` to read URL query parameters in Wouter; do not attempt to split the value from `useLocation()`.

**Why:** `useLocation()` supplies the pathname, so query-driven screens can render their default state without obvious errors when their initialization effect tries to parse it.

**How to apply:** Treat the `useSearch()` result as the dependency for URL-initialization effects, and verify direct deep links in a fresh browser context.