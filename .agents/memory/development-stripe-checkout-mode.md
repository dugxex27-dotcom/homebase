---
name: Development Stripe checkout mode
description: Constraint on validating checkout purchases in the current development environment.
---

Development hosted Stripe Checkout is currently configured in live mode. Stripe's standard test card numbers are rejected before a subscription can be completed.

**Why:** A real browser purchase verification in August 2026 reached hosted Checkout and received Stripe's explicit live-mode/test-card decline, leaving the test homeowner inactive.

**How to apply:** Do not attempt real Stripe test-card purchase verification until the development server is configured with a matching Stripe test-mode backend key and publishable key. Otherwise use an approved non-payment test seam or report the checkout-mode blocker; never use a real card for agent verification.