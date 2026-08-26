---
name: lib/db schema changes require tsc --build before dependent typecheck
description: Adding a column to lib/db/src/schema/schema.ts doesn't show up in consuming packages' typecheck until the composite project's declaration files are rebuilt.
---

`lib/db` is a TypeScript composite project (`composite: true`, `emitDeclarationOnly: true`) that
emits `.d.ts` files to `lib/db/dist`. Consumers like `@workspace/api-server` reference it via
TS project references (`references: [{ path: "../../lib/db" }]`), and `tsc -p ... --noEmit` for
the consumer resolves types from those pre-built `.d.ts` files, not live from `lib/db/src`.

**Why:** after editing `lib/db/src/schema/schema.ts` (e.g. adding a new column), the consuming
package's typecheck fails with "Object literal may only specify known properties" or "Property
does not exist" for the new field, even though the source is correct — the stale `dist/*.d.ts`
is still what's being read.

**How to apply:** after any `lib/db` (or other composite `lib/*`) schema/type change, run
`pnpm run typecheck:libs` (`tsc --build` at the repo root) first to regenerate declarations, then
re-run the dependent package's typecheck. Skipping this step produces misleading type errors that
look like the schema edit didn't take effect.
