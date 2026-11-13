# Visual form builder

Spanish version: [es/builder.md](es/builder.md).

`artisanform/builder` is a drag-and-drop editor that produces an [`ArtisanSchemaV1`](schema-v1.md). Put it in a CRM or an admin panel so people who do not write JSON can build a form, see it live and save the schema your backend stores and serves ([backend guide](backend.md)). The output is only the schema: no business logic, no storage.

## Install

The builder is an optional entry. Its drag and drop uses `@dnd-kit`, declared as **optional peers** (nothing else in the package needs them):

```bash
bun add artisanform @dnd-kit/core @dnd-kit/sortable
```

## Quick start

```tsx
'use client';
import 'artisanform/style.css'; // the live preview is a real <ArtisanForm>
import 'artisanform/builder.css';
import { FormBuilder } from 'artisanform/builder';

export default function Editor() {
  return (
    <FormBuilder
      defaultValue={stored}               // an ArtisanSchemaV1, or omit it to start blank
      onChange={({ schema, ok, issues }) => setDraft(schema)}
      onSave={({ schema, hash }) => api.save(schema, hash)}
    />
  );
}
```

`onChange` fires on every edit with `{ schema, ok, issues }` (`ok` is false while an error-level issue exists). `onSave` is called from the toolbar's Save button, only while the schema is valid, with the same fields plus `hash`: the SHA-256 of the canonical JSON, useful as an ETag.

## The parts

| Part | What it does |
| --- | --- |
| Palette | Every input type, grouped by category; drag it onto the canvas, or press Enter or click to add it |
| Canvas | Steps as tabs, fields as a sortable list; select, duplicate, remove, reorder or move to another step; repeating groups hold rows |
| Inspector | The settings of what is selected (form, step or field), generated from the catalog; options and validation editors |
| Preview | The real `<ArtisanForm>` with the schema in memory (no draft is saved, nothing is submitted); device width, theme and language |
| Issues | `checkSchema` live: each issue jumps to the element it is about |
| Toolbar | Undo and redo (100 steps), simple or advanced mode, validity badge, copy JSON, save |
| Panels | JSON (edit and import), templates and translations |

The preview restarts typed values when the schema changes (that is what `<ArtisanForm>` does with a new schema).

## Props

| Prop | Meaning |
| --- | --- |
| `value` / `defaultValue` | Controlled or uncontrolled schema |
| `onChange` / `onSave` | See above |
| `manifest` or `registrations` | What your front end can run (`describeCapabilities` / `describeRegistrations`): feeds the custom types and the dropdowns of hook, strategy and renderer ids |
| `policy`, `limits` | The same ones of the parser: they also decide which inputs are offered |
| `baseline` | The published schema: changing the type of a question that already has answers is flagged (`compareSchemas`) |
| `mode` | `simple` (default) hides advanced and developer settings; `advanced` shows everything |
| `readOnly` | Nothing can be edited; the preview and the JSON still work |
| `features` | Turns modules off: `conditions`, `steps`, `translations`, `templates`, `import`, `json`, `preview` (all on by default) |
| `templates` | Starting points of the gallery (default: blank, contact, registration, survey, job application) |
| `previewProps` | Props of the preview's `<ArtisanForm>`: `components`, `extensions`, `theme`… |
| `labels`, `classNames`, `unstyled` | Texts and styling, see below |

## Custom types

A custom `x-*` type described in the manifest appears in the palette. If its spec has a `config` shape, the inspector builds the controls from it (numbers with their range, enums as dropdowns, booleans as checkboxes); without a shape the config is edited as JSON.

```tsx
import { describeCapabilities } from 'artisanform/schema';

const manifest = describeCapabilities({
  customTypes: [{ type: 'x-satisfaction', kind: 'field', config: { type: 'object', required: ['max'], properties: { max: { type: 'integer', minimum: 1, maximum: 10 } } } }],
});
<FormBuilder manifest={manifest} />;
```

## Conditions, steps and translations

Each is a module you can turn off with `features`. Conditions (`visibleWhen`, `next[].when`) are built from a field picker, an operator and a value typed after the field, with `all`/`any`/`not` groups. Steps can be added in any native kind, reordered and linked with `next`, loops and `revisit`; a flow overview lists the reachable path and warns about unreachable steps or unbounded loops. Translations list every translatable text per language, mark missing, orphaned and mismatched-placeholder entries, and write the `i18n` block of the schema.

## Keyboard and accessibility

Drag with the mouse or touch; with the keyboard focus a handle, press Space to pick up, the arrow keys to move, Space to drop and Escape to cancel; a live region announces each step. Every row also has move up and down, duplicate, remove and move-to-step buttons, so nothing requires a drag. The builder is checked with axe in the end-to-end tests.

## Compose your own layout

`<FormBuilder>` is `FormBuilderProvider` plus the parts. Use them separately (`Palette`, `Canvas`, `Inspector`, `Preview`, `Issues`, `Toolbar`, `Flow`, `JsonPanel`…) inside `FormBuilderProvider` and read the state with `useBuilder()`. The pure model (`addField`, `moveField`, `setProperty`, `checkSchema`-safe operations, the catalogs and the undo history) is exported too and has no React.

```tsx
import { FormBuilderProvider, Palette, Canvas, Inspector } from 'artisanform/builder';

<FormBuilderProvider defaultValue={schema} onChange={save}>
  <Palette /><Canvas /><Inspector />
</FormBuilderProvider>;
```

## Styling

`artisanform/builder.css` is separate from `style.css` and is only loaded if you use the builder. It uses single `afb-*` classes and the `--artisan-*` variables of the form (each with a fallback), so it follows your theme. `classNames` adds classes per slot and `unstyled` removes the built-in ones. It adapts to the width of its container, not the window.

## Texts

Every text is English by default and overridable: pass `labels={{ … }}` (a partial `BuilderLabels`; `defaultBuilderLabels` lists the keys).

## Next.js

`artisanform/builder` ships the `'use client'` directive, so it works in both routers; import the two stylesheets once in a layout or in the client page.

## Limitations

- The stepper style and step icons are not editable: the 1.x contract has no such properties yet. They are planned as an additive change.
- Repeating groups hold plain rows (no nested groups, content or custom types), as the contract does.
- Hook, renderer and strategy code is never edited: only registered ids are chosen.
- There is no collaborative editing or storage: you persist the schema through the callbacks.
