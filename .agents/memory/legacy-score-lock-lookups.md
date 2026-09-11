---
name: Legacy score-lock lookups
description: How to identify legacy scored records when guarding edits that would move them between scoring periods.
---

When an edit guard must locate a legacy score record without a direct ID link, match the score using the record's existing stored date and other stable attributes. Do not use the requested replacement date.

**Why:** The score record remains in the original scoring period. Looking it up using the proposed date misses it and allows the exact cross-month or cross-year move the guard is intended to block.

**How to apply:** For date mutations on scored maintenance or evidence records, validate the requested date separately, but derive legacy score lookup year/month from the persisted record.