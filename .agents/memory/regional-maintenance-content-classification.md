---
name: Regional maintenance content classification
description: Rules for generating useful, safe regional maintenance task details at catalog scale.
---

Classify regional maintenance tasks from the title's action and concrete object before consulting description text. Concrete object families must outrank broad seasonal/weather language, and ambiguous objectless weather notices belong to a safe observation family rather than an unrelated system family.

**Why:** Broad substring matching against title plus description produced plausible-looking but wrong instructions, tools, time, and costs—for example security work receiving window-sealing guidance or septic work receiving appliance guidance. A zero-fallback count does not prove semantic correctness.

**How to apply:** Preserve authored fields, use explicit action/object sub-intents for hazardous or specialized work, expose intent/fallback/cost-applicability metadata, and audit normalized catalog assignments with required and prohibited content checks. Passive monitoring should explicitly suppress contractor/material cost ranges; hands-on checks should not.