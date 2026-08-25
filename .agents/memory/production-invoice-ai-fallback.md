---
name: Production invoice AI fallback
description: Live invoice analysis can persist a pending manual-review record when its AI provider credentials are unavailable.
---

Production invoice analysis is designed to continue with a low-confidence, manual-review response when the AI extraction provider is unavailable; it does not return a 500 for that extraction failure.

**Why:** The live verification on 2026-08-25 logged a missing AI-provider credential and returned an otherwise valid analysis with null extracted fields and an `aiNotes` fallback message. Confirmation and duplicate-hash enforcement still completed successfully.

**How to apply:** Treat a 201 analysis response with `aiNotes` indicating extraction failure as a degraded AI configuration state, not evidence that extraction succeeded. Verify the manual confirmation flow separately, and investigate production AI credentials if automatic extraction is expected.