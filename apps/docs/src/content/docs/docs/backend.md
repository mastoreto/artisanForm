---
title: "Backend guide"
---


A v1 schema is plain JSON, so it can live in any database and be served by any backend. What a backend needs from ArtisanForm is a way to **check** a schema before it trusts it, to **version** it, and to **validate the answers** that come back. All of it is pure TypeScript in `artisanform/schema` (no React, no Yup; see [Schema v1](../schema-v1/)), plus a JSON Schema and a CLI for backends that do not run Node.

The library gives you the checks and a few helpers. How you store, version and authorize schemas is yours: everything under "Where to store it" is a recommendation, not a requirement.

```json
{
  "$schema": "https://unpkg.com/artisanform/dist/schema.json",
  "schemaVersion": 1,
  "id": "event-registration",
  "revision": 3,
  "steps": [
    {
      "id": "attendee",
      "type": "form",
      "title": "Attendee",
      "fields": [
        { "name": "fullName", "type": "text", "label": "Full name", "required": true },
        { "name": "documentNumber", "type": "text", "label": "Document", "sensitive": true }
      ]
    }
  ]
}
```

## The flow

A schema enters your system once (saved), becomes a revision (published), is read many times (served) and collects answers (received). Each stage has one function:

| Stage | What you do | Function |
| --- | --- | --- |
| Save | Refuse anything that is not a valid schema your front end can run | `checkSchema` |
| Publish | Make sure old answers keep their meaning; freeze the revision | `compareSchemas`, `schemaHash` |
| Serve | Send the revision with a cache validator | `schemaHash` (ETag) |
| Receive | Validate and clean the answers | `validateValues` |
| Read back | Know which answers are sensitive or which questions exist | `sensitiveAnswerKeys`, `answerFields` |

### Save a draft

`checkSchema` is the single gate. It parses the contract, applies your policy and limits, lints, and checks the schema against what your front end registered, including the `config` of custom types. It never throws.

```ts
import {
  checkSchema,
  schemaHash,
  type CapabilitiesManifest,
} from 'artisanform/schema';

// Ceilings for schemas that come from users (see "Recommended limits").
const limits = { maxBytes: 200_000, maxSteps: 50, maxFields: 300, maxOptions: 500 };

export async function saveDraft(
  formId: string,
  input: unknown,
  manifest: CapabilitiesManifest, // from describeRegistrations, see below
) {
  const result = checkSchema(input, { limits, manifest });
  // Errors block; warnings (a lint finding, a degradable gap) are returned, not fatal.
  if (!result.ok) return { status: 422, issues: result.issues };

  const hash = await schemaHash(result.schema);
  await db.drafts.upsert({
    formId,
    schema: result.schema, // store it as received: the author's JSON
    hash,
    references: result.references, // what it asks of the front end
  });
  return { status: 200, hash, warnings: result.issues };
}
```

For a schema that comes from outside your own team, also pass a `policy`: the lists of hooks, renderers, payment providers and so on it may name. Derive it from the same manifest so the two cannot disagree.

### Publish a revision

Publishing freezes a revision: a published row is never edited, so every answer can point at the exact schema it was given with. Before freezing, compare with what is live.

```ts
import { compareSchemas } from 'artisanform/schema';

const diff = compareSchemas(live.schema, draft.schema);
if (!diff.compatible) {
  // a question kept its name but changed type: old answers would change meaning
  throw conflict(diff.typeChanged);
}
// added or removed questions, a new `required` or dropped options are compatible
await db.publish(draft.id); // archive the live one and freeze this one, in one transaction
```

`diff` also lists `added`, `removed`, `requiredChanged` and `optionsRemoved`, which is what you need to ask people to complete a form again.

### Serve it

A published revision never changes, so cache it hard. Use the hash as the ETag.

```ts
app.get('/forms/:id/revisions/:rev', async (req, res) => {
  const row = await db.revision(req.params.id, Number(req.params.rev));
  const etag = `"${row.hash}"`;
  res.set({ ETag: etag, 'Cache-Control': 'public, max-age=31536000, immutable' });
  if (req.get('If-None-Match') === etag) return res.status(304).end();
  res.json(row.schema);
});
```

The "latest published" URL changes over time: give it `Cache-Control: no-cache` (or a short `max-age`) with the same ETag so clients revalidate.

### Receive answers

Never trust the browser's validation. `validateValues` is stricter than the form on purpose (it also checks that a choice is one of the options, the length of an OTP, the size of an upload). With `prune: true` it returns the answers without hidden fields and unknown keys.

```ts
import { validateValues } from 'artisanform/schema';

const form = await db.publishedRevision(formId);
const result = validateValues(form.schema, body.answers, {
  prune: true,
  dynamicOptions: await optionsOf(form.schema), // the ids your options sources resolve to
  maxItems: 1000,
});
if (!result.ok) return res.status(400).json({ issues: result.issues });
await db.submissions.insert({ formId, revision: form.revision, answers: result.values });
```

Issues are `{ path, code, params }` with no text, so your API stays language-neutral: the front end words them with its `labels`. A field with an `optionsSource` is only checked for membership if you pass its ids in `dynamicOptions`.

### Read answers back

`sensitiveAnswerKeys(schema)` lists the answer keys flagged `sensitive: true` (both ends of a date range, a whole `array` if any of its fields is flagged). The library only carries the flag: whether someone may read those answers is your permission model. `answerFields(schema)` lists the questions, which is what you need for an export or a projection table.

## Where to store it

The schema is one JSON document. Start with the simplest model and add structure only for what you query.

### Model A: one document per revision

One row per revision with the schema in a JSON column, the hash, the status and the revision number. A published row is immutable; there is at most one published row per form. Answers are one JSON document per submission, with the revision they were given against. This is enough for most apps and is the recommended starting point.

### Model B: plus a table of fields

When you need to index questions, attach permissions to them or build reports across revisions, project the fields into a table when you save a draft, from `answerFields`. The schema stays the source of truth; the table is derived and rebuilt on every save.

```ts
import { answerFields, sensitiveAnswerKeys } from 'artisanform/schema';

const sensitive = new Set(sensitiveAnswerKeys(schema));
const rows = answerFields(schema).map((field) => ({
  formRevisionId,
  fieldKey: field.name,
  type: field.type,
  required: 'required' in field && field.required === true,
  classification: sensitive.has(field.name) ? 'sensitive' : 'normal',
}));
```

### Model C: fully normalized

Tables for forms, steps, fields and options (or a key/value table for answers, one row per answered field) let you run SQL over every question and answer. They cost a lot: a schema is a tree with conditions and transitions, so rebuilding the JSON from rows is code you maintain, and every contract addition becomes a migration. Choose it only when you must query answers relationally at scale; even then, keep the JSON document as the source of truth and use the tables as an index.

### Answers

Store each submission as a JSON document with its revision, and never rewrite history: a new answer is a new row. To report on a few answers, project those columns (or generated columns) instead of normalizing everything. For heavy analytics, load them into a key/value table in a warehouse.

## Column types by database

All of them store the same JSON text. Differences worth knowing: some databases do not keep key order (so hash with `schemaHash`, which sorts keys, and the hash of what you read back equals the hash of what you saved), and their built-in JSON validators speak older drafts of JSON Schema than the one in `artisanform/schema.json`. Check your version's documentation for exact features.

### PostgreSQL

```sql
CREATE TABLE form_revisions (
  id          uuid PRIMARY KEY,
  form_id     uuid NOT NULL,
  revision    integer NOT NULL,
  status      text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema      jsonb NOT NULL
              CHECK (jsonb_typeof(schema) = 'object' AND schema->>'schemaVersion' = '1'),
  hash        text NOT NULL,
  UNIQUE (form_id, revision)
);
-- at most one published revision per form
CREATE UNIQUE INDEX one_published ON form_revisions (form_id) WHERE status = 'published';

CREATE TABLE submissions (
  id          uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES form_revisions (id),
  answers     jsonb NOT NULL
);
CREATE INDEX submissions_answers ON submissions USING gin (answers jsonb_path_ops);
```

`jsonb` is binary and drops duplicate keys and key order. Use the `pg_jsonschema` extension if you want the database to check structure with `artisanform/schema.json`.

### MySQL and MariaDB

```sql
CREATE TABLE form_revisions (
  id        BINARY(16) PRIMARY KEY,
  form_id   BINARY(16) NOT NULL,
  revision  INT NOT NULL,
  status    VARCHAR(10) NOT NULL,
  `schema`  JSON NOT NULL,           -- MariaDB: LONGTEXT CHECK (JSON_VALID(`schema`))
  hash      CHAR(64) NOT NULL,
  schema_id VARCHAR(100) GENERATED ALWAYS AS (`schema`->>'$.id') STORED,
  UNIQUE KEY (form_id, revision),
  KEY (schema_id)
);
```

MySQL's `JSON` type validates syntax and reorders keys. `JSON_SCHEMA_VALID()` accepts draft 4 only, so it cannot use `schema.json` as it is; keep structural checks in your app. In MariaDB, `JSON` is an alias for `LONGTEXT`, so add the `JSON_VALID` check yourself.

### SQL Server

```sql
CREATE TABLE form_revisions (
  id        uniqueidentifier PRIMARY KEY,
  form_id   uniqueidentifier NOT NULL,
  revision  int NOT NULL,
  status    nvarchar(10) NOT NULL,
  [schema]  nvarchar(max) NOT NULL CHECK (ISJSON([schema]) = 1),
  hash      char(64) NOT NULL,
  schema_id AS JSON_VALUE([schema], '$.id'),
  CONSTRAINT uq_form_revision UNIQUE (form_id, revision)
);
```

`nvarchar(max)` with `ISJSON` keeps the text exactly as saved. Newer releases and Azure SQL add a native `json` type; check yours.

### Oracle

```sql
CREATE TABLE form_revisions (
  id        RAW(16) PRIMARY KEY,
  form_id   RAW(16) NOT NULL,
  revision  NUMBER(10) NOT NULL,
  status    VARCHAR2(10) NOT NULL,
  schema_doc JSON NOT NULL,          -- 21c and later; before that: CLOB CHECK (schema_doc IS JSON STRICT)
  hash      CHAR(64) NOT NULL,
  CONSTRAINT uq_form_revision UNIQUE (form_id, revision)
);
```

`schema` is a SQL keyword, so these examples quote or rename it where a database needs that. Recent Oracle releases can validate a document against a JSON Schema in an `IS JSON VALIDATE` constraint.

### SQLite

```sql
CREATE TABLE form_revisions (
  id       TEXT PRIMARY KEY,
  form_id  TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status   TEXT NOT NULL,
  schema   TEXT NOT NULL CHECK (json_valid(schema) AND json_extract(schema, '$.schemaVersion') = 1),
  hash     TEXT NOT NULL,
  UNIQUE (form_id, revision)
);
```

### MongoDB

A revision is a document; no mapping is needed.

```js
db.createCollection('form_revisions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['formId', 'revision', 'status', 'hash', 'schema'],
      properties: {
        status: { enum: ['draft', 'published', 'archived'] },
        schema: { bsonType: 'object', required: ['schemaVersion', 'id', 'steps'] },
      },
    },
  },
});
db.form_revisions.createIndex({ formId: 1, revision: 1 }, { unique: true });
```

MongoDB's `$jsonSchema` is a draft 4 subset without `$ref`, so validate only the envelope there and run `checkSchema` in your app. The parser already rejects field names containing `.`, `[` or `]`; avoid names starting with `$` as well.

## Validating the contract without Node

`artisanform/schema.json` is the JSON Schema (draft 2020-12) of the structure of a v1 schema: types, known keys, enums and required properties. Any validator for that draft can use it (ajv, Python's `jsonschema`, a JSON Schema library for the JVM or .NET). It deliberately does **not** cover rules that need the whole document: unique names and ids, references between fields and steps, the flow, policy, limits and capabilities. For those, run the CLI as a subprocess, or `checkSchema` in a small Node service.

```bash
npx artisanform validate schema.json --max-bytes 200000 --max-fields 300 --manifest capabilities.json
npx artisanform json-schema > artisanform.schema.json
npx artisanform hash schema.json
```

`validate` prints one line per issue and exits `0` when every file is valid, `1` when a schema has errors and `2` for wrong usage. Add `--json` for a machine-readable report. Put it in CI for schemas kept in a repository, or in a pre-commit hook.

Add `"$schema": "https://unpkg.com/artisanform/dist/schema.json"` to a schema file and most editors will complete and check it as you type.

## Plugins and custom types

A schema only names things that live in the app: hooks, wait strategies, renderers, actions, option sources, payment providers, storage adapters and custom (`x-…`) field and step types. The same checks run in three places so they cannot disagree: your backend when it saves a revision, the CLI in CI, and `<ArtisanForm>` before it renders.

### Declare the shape of a custom type

Give each custom field or step a `spec`: the shape of its `config`, as plain data (a small subset of JSON Schema: `type`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `items`, `properties`, `required`, `additionalProperties`).

```ts
import type { FieldRegistry } from 'artisanform';

const fields: FieldRegistry = {
  stars: {
    render,
    initialValues,
    rules,
    spec: {
      type: 'x-stars',
      kind: 'field',
      config: {
        type: 'object',
        required: ['max'],
        properties: { max: { type: 'integer', minimum: 1, maximum: 10 } },
        additionalProperties: false,
      },
    },
  },
};
```

### Generate the manifest from what you register

`describeRegistrations` derives the capabilities manifest from the same props you give `<ArtisanForm>`: one source instead of four lists kept by hand. Run it where your app builds, and give the JSON to your API and to the CLI.

```ts
import { describeRegistrations } from 'artisanform';
import { writeFileSync } from 'node:fs';

const manifest = describeRegistrations({ extensions, fields, stepTypes, plugins, storage });
writeFileSync('capabilities.json', JSON.stringify(manifest, null, 2));
```

The manifest carries each `spec`, so the backend verifies a schema's custom `config` (`invalid-config`, with the exact path) without running any of your code.

### What stops a form and what only warns

| Finding | Severity | What the user sees |
| --- | --- | --- |
| Invalid schema, policy or limit violation | error | the form is replaced by a message |
| Missing hook, wait strategy, renderer, action | error | the form is replaced by a message |
| Payment provider not registered | error | the form is replaced by a message, before anything is filled |
| Step type not registered, invalid custom `config` | error | the form is replaced by a message |
| Options source not registered | warning | the field shows no options |
| Storage adapter not registered | warning | the field shows its own notice when a file is added |
| Custom field type not registered | warning | that field shows an "Unknown field type" notice |
| Lint finding, anything found in a 0.2.0 schema | warning | nothing; it is reported |

The backend gate (`checkSchema`) and `<ArtisanForm>` use the same classification (`capabilitySeverity`).

### Show errors without breaking the form

`<ArtisanForm>` never throws on a schema that cannot run. It shows a short, translatable message (`labels.schemaErrorMessage`); outside production it also lists each error with its code and path (`showSchemaIssues`). Everything, errors and warnings, goes to `onSchemaIssues`, so you can log or alert. `fallback` replaces the message with your own node or function.

```tsx
<ArtisanForm
  scheme={schema}
  onSchemaIssues={(issues) => logger.warn('form schema', issues)}
  fallback={<ContactSupport />}
  onSubmit={save}
/>
```

A blocked form never reads or overwrites a saved draft, and when the schema is fixed the form comes back without a remount.

## Recommended limits

None applies unless you set it. For schemas that come from users, start here:

| Limit | Where | Suggested |
| --- | --- | --- |
| Schema size | `limits.maxBytes` | 200 000 |
| Steps | `limits.maxSteps` | 50 |
| Fields (rows of arrays and content fields count) | `limits.maxFields` | 300 |
| Options in one list | `limits.maxOptions` | 500 |
| Items in one answer list | `validateValues` `maxItems` | 1 000 (the default) |
| Length of one text answer | `validateValues` `maxStringLength` | 10 000 (the default) |
