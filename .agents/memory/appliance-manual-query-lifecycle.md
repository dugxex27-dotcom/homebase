---
name: Appliance manual query lifecycle
description: Keep child manual queries from refetching a parent appliance after deletion.
---

When deleting an appliance, remove that appliance's manual cache entry instead of invalidating every active manual query.

**Why:** An active manual query is keyed by the appliance IDs currently rendered. Invalidating it before the appliance list refreshes briefly requests manuals for the deleted appliance, yielding an avoidable 404 despite a successful deletion.

**How to apply:** For parent-child query relationships, update or remove the deleted parent's child cache data first, then refresh the parent list. Let the resulting UI render establish the next set of child query keys.