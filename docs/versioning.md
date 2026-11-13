# Versioning and the 1.x contract

Spanish version: [es/versioning.md](es/versioning.md).

From 1.0.0 the library follows semantic versioning over **three public surfaces**. Anything not listed here is internal and can change in any release.

1. **The schema contract** (`schemaVersion: 1`): what the parser accepts and what `normalizeArtisanSchema` produces ([schema v1](schema-v1.md)).
2. **The TypeScript API** of the root entry (`artisanform`) and of `artisanform/schema`, snapshotted in `api/index.api.txt` and `api/schema.api.txt`.
3. **The capabilities contract** (`artisanform.capabilities/1`) and the **catalog format** (text paths such as `steps.<id>.fields.<name>.label`, `labels.<key>`).

## What may change in a minor (1.x)

- A new **optional** property on an existing element, a new optional step or field option, a new export, a new `labels` key, a new `Feature` in the capabilities contract.
- A **new field or step type**. A front end built on an older 1.x does not know it: it reports `unsupported-field-type` / `unsupported-step-kind` through `checkCapabilities`, so an API refuses the schema instead of rendering it wrong.
- Stricter checks that only reject what was already meaningless (documented in the changelog).

## What needs a major (2.0)

- Removing or renaming a property, a type, a code, a path or an export; changing what a valid schema means; making an optional property required.
- A schema that parsed and normalized under 1.x that no longer does, or normalizes to different JSON (defaults included).
- Changing an issue `code` of the parser, `validateValues` or the capabilities contract.

`schemaVersion` stays `1` for the whole 1.x line. A reader that sees a larger number rejects it (`unsupported-version`).

## How it is enforced

| Guard | What it catches |
|---|---|
| `src/schema/__tests__/golden.test.ts` + `fixtures-v1/` | The 13 catalog examples must parse without issues, normalize to the recorded JSON, be idempotent and portable; the invalid cases keep their exact codes and paths |
| `src/schema/__tests__/docs.test.ts` | Every JSON/TypeScript example of the schema guide parses |
| `bun run check:api` (CI, release, `prepublishOnly`) | Any change in the exports or declarations of the two entries. Removed or changed lines are breaking, added lines are minor |
| Parity fixtures (`src/schema/__tests__/values/`) | The browser (Yup) and `validateValues` agree on the shared rules |

When a guard fails the change is not a "fixture update": decide whether it is a minor or a major, then update the snapshot or fixture **in the same PR** (`node scripts/check-api.mjs --write`, `UPDATE_GOLDEN=1 bun test golden`) so the diff is reviewed.

## Deprecation

A deprecated name keeps working for the whole major, is marked `@deprecated` with its replacement, and is listed in the changelog. It is removed only in the next major.

## Stored schemas

Normalization is deterministic and idempotent, so a schema stored with a revision keeps rendering the same under any 1.x. Drafts of in-progress forms carry the `revision` and follow the snapshot rules of [schema v1](schema-v1.md#11-persistence-).
