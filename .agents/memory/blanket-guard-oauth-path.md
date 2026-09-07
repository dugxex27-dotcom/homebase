---
name: Blanket route guards and OAuth timing
description: Why protected routes need their suspension check after route authentication instead of relying only on a prefix guard.
---

An Express prefix guard registered before route-level authentication cannot assume the request's OAuth identity has already been populated. Protected routes under that prefix must include their own suspension middleware after authentication.

**Why:** OAuth identity may be attached by the route's authentication middleware only after the earlier prefix middleware has already called `next()`, allowing a suspended OAuth user past a prefix-only check.

**How to apply:** For every authenticated route beneath a blanket protected prefix, place the suspension check directly after authentication in the route middleware chain. Explicitly document any unauthenticated, independently authenticated endpoint that cannot use a user suspension check.