---
name: HIN address unit extraction
description: Decision behind how apartment/unit/suite tokens are captured for Home Identification Numbers
---

Combined-address parsing for HINs treats a unit/apartment/suite token as
extractable from either inside the street text or as its own address segment
positioned before the city — not just one or the other.

**Why:** real addresses put the unit in both places depending on source
(typed by hand vs. geocoded verbose strings), and only handling one shape
left a supported class of addresses with a permanently blank unit column,
since HIN rows are append-only and can't be corrected in place later.

**How to apply:** when extending address parsing, keep checking both
placements rather than assuming a single canonical position for the unit.
