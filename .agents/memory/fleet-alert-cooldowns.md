---
name: Fleet-wide alert cooldowns
description: Concurrency and availability rules for alerts aggregated across API instances
---

Shared alert thresholds and cooldowns must be updated atomically in the database. Use a unique per-attempt claim token so only the mutation that advances the cooldown emits the alert; timestamp equality is not proof of ownership when instances act in the same millisecond.

**Why:** Process-local counters miss failures handled by other instances, and comparing a returned cooldown timestamp to a request timestamp can let simultaneous requests all believe they own one alert.

**How to apply:** For any fleet-wide readiness or alert state, serialize mutations on one shared row, return a unique ownership token from the atomic mutation, keep telemetry off response-critical paths, and report health as unavailable rather than healthy when the shared row cannot be read. Deduplicate persistent-condition alerts by a stable identity set rather than only a cooldown, and conditionally release the ownership token after delivery failure so a later scan can retry.