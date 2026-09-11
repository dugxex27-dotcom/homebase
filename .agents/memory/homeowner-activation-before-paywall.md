---
name: Homeowner activation before paywall
description: Product policy for the first homeowner value sequence and honest subscription state.
---

Every homeowner must be able to add one home, see the canonical 0–1000 Home Wellness Score™, and complete an initial maintenance task before upgrade prompts block deeper value. Multi-home access and deeper paid features may remain gated. Never implement this by changing or pretending the user's subscription status on the client.

**Why:** An early dashboard paywall prevents users from understanding the product, while a client-side fake trial state disagrees with server authorization and creates broken, untrustworthy flows.

**How to apply:** Keep the dashboard and first-score path available to a real free/inactive account, enforce paid limits server-side, and test the activation sequence with a pristine homeowner identity. Keep the quiz's 0–100 result named Home Readiness Checkup so it is not confused with the canonical score.