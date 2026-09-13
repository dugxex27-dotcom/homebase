---
name: Demo fixture self-healing
description: Safety and freshness rules for long-lived role demo accounts.
---

Role demo login and reset paths should ensure the complete canonical fixture set rather than returning early when the account already exists. Refresh only timestamps that intentionally drive rolling demo KPIs; keep stable IDs and historical fields unchanged.

**Why:** Long-lived demo accounts can retain partial or stale fixtures, causing zero dashboards even when the seeder once ran. Blind fixed-ID upserts are also unsafe because an unexpected collision could reassign or overwrite a real user's data.

**How to apply:** Make every demo revisit idempotently repair missing canonical rows and approved demo-only states. Before updating a fixed ID, verify the existing row is explicitly demo-owned and belongs to the canonical demo owner. On collision, roll back, return a structured failed section, and alert without mutation.