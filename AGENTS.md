# AGENTS.md — ArtisanForm

React library for multi-step forms (wizards) with ready-made inputs. It ships as a library (`vite build`, entry `src/index.ts`) and is developed and documented with Storybook.

## Language

- **Everything generated in this repository is written in English**: code, identifiers, comments, JSDoc, test names, commit messages, PR and issue text, `README.md`, `AGENTS.md`, `CHANGELOG.md` and everything under `docs/`.
- **Spanish versions live in [`docs/es/`](docs/es/)** and mirror the English documents: [`README`](docs/es/README.md), [`AGENTS`](docs/es/AGENTS.md), [`CHANGELOG`](docs/es/CHANGELOG.md), [`schema v1`](docs/es/schema-v1.md), [`backend`](docs/es/backend.md), [`UI`](docs/es/ui.md), [`payments`](docs/es/payments.md), [`files`](docs/es/files.md), [`accessibility`](docs/es/accessibility.md) and [`releasing`](docs/es/releasing.md) and [`versioning`](docs/es/versioning.md). Read them when you need the Spanish text; **when you change an English document, update its Spanish copy in the same change**.
- Library texts are never hard-coded: built-in defaults (`src/commons/labels.ts`) are English and every one is overridable through the `labels` prop. Field labels, names and step titles are free text supplied by the user's schema. Demo copy (playground, stories, fixtures, tests) is English too.
- Reply to people in the language they write to you in; the repository artifacts stay in English.

## Stack

React 18/19 · TypeScript 6 (strict) · Plain CSS (`af-*` classes + `--artisan-*` variables) · Zustand (step state) · React Hook Form + Yup (validation) · Storybook 10 · Vite 8 + React Compiler (Rust, `react-compiler.ts`) · Bun workspaces (`bun.lock`).

## Commands

```bash
bun install
bun run storybook         # dev server on :6006
bun run build-storybook
bun run lint              # biome check
bun run format            # biome check --write
```

Also: `bun run check:next` (the packed tarball in a clean Next 15/16 app with both routers, after a build), `bun run playground` (live test app, scenarios in `playground/src/scenarios/`), `bun run e2e` (Playwright, `e2e/`), `bun run build` (library), `bun run typecheck` and `bun test` (`*.test.ts(x)` next to the code).
Also: `bun run check:api` (public API snapshot in `api/`, see `docs/versioning.md`) after a build; `bun run perf` (Web Vitals budgets on the production playground; see `docs/performance.md`) and `bun run check:size` after a build; `bun run lint:react` (React Hooks/Compiler rules), `bun run check:dist`, `bun run check:package` and `bun run check:pack` after a build; `ARTISAN_BROWSERS=chromium,firefox,webkit` runs e2e in more browsers (default: Chromium); `ARTISAN_COMPILER=off` disables the React Compiler (playground, build, e2e) to compare behavior. Never read mutable state (`getValues()`, refs) during render in compiled code.
Minimum verification for a change: `bun run lint` + `bun run typecheck` + `bun run build` + `bun test` + the story renders without errors. Check the **exit code** of each command, not just the tail of its output.

## Structure

```
src/
  index.ts               library entry (public exports only)
  schema/                public v1 contract (JSON). Must NOT import react/react-hook-form/yup/zustand (test + Biome rule)
    contract/            types, fields, steps, define, specs, conditions, json, errors
    legacy/              the 0.2.0 shape (types.ts) + the adapter to v1 (adapter.ts)
    parser.ts · normalize.ts
    __tests__/           + fixtures/ (0.2.0 schemas mirroring the playground)
  persistence/           ArtisanSnapshotV1 and draft storage (does not import the engine either)
  engine/                runs a schema; React Hook Form/Yup/Zustand live here
    project.ts           normalized schema → the shape the wizard consumes (the only seam that knows both)
    form/                useFormBinding (single useForm), useArtisanField (input binding), errors, validators
    buildSchema.ts · conditions.ts · draft.ts · extensions.ts · navigation.ts · store/useArtisanStore.ts
  components/
    ArtisanForm/         ArtisanForm.tsx (public) · Wizard.tsx (render) · useWizard.ts (behavior) · Stepper.tsx · __tests__/ (integration)
    Controls/            Previous / Next / Finish buttons
    inputs/<Name>/       <Name>.tsx + <Name>.stories.tsx, one folder per input
    fields/registry.tsx  field registry (render + initial values + rules per type)
    steps/               registry.tsx (step registry) · PaymentStep.tsx · StatusPanel.tsx
    ui/                  UiContext (classNames, unstyled, components), types.ts (public UI contracts), FieldParts, InputBridge
    StandaloneForm/      form wrapper for standalone inputs
  integrations/          optional capabilities with their own contract
    payments/            types, mock, Loading, providers/{stripe,lemonsqueezy,mercadopago,paypal} (package subpaths)
    storage/             StorageAdapter + presignedPut, cloudinary, mock
    wait/                WaitStrategy (polling, sse, websocket, callback)
  commons/               cn.ts (clsx), labels.ts (texts)
  styles/artisanform.css the only stylesheet: plain CSS, `af-*` classes, `--artisan-*` tokens
  __tests__/setup.ts     happy-dom preload for bun test
bin/                     the `artisanform` CLI (validate, json-schema, hash); runs the built `dist/schema.js`
packages/                workspace packages: ui-bootstrap, ui-mui, ui-tailwind, ui-scss (kits), ui-shadcn (template + registry item)
playground/              React test app (scenarios in src/scenarios)
e2e/                     Playwright tests
docs/                    English guides; docs/es/ has the Spanish versions
apps/docs/               Astro/Starlight docs site (en/es), deployed with Vercel
apps/payments-test/       test app: real payment plugins against sandboxes (Hono backend + Vite)
```

Tests live in a `__tests__/` folder next to the code they cover (stories stay beside their component). Root config files (`vite`, `tailwind`, `postcss`, `biome`, `tsconfig`, `bunfig`, `playwright`) stay at the root because the tools look for them there.

A schema is normalized (`schema/normalize.ts`) and projected to the engine (`engine/project.ts`): that is the only seam that knows both shapes. A new field or step in the v1 contract needs its type in `schema/contract/fields.ts|steps.ts`, its entry in `schema/contract/specs.ts` (the compiler enforces it), the parser and the projection. Guide: `docs/schema-v1.md`.

A new field type is a `FieldDefinition` in `components/fields/registry.tsx` (render, initial values, rules) plus its component in `components/inputs`. A new step type is a `StepDefinition` in `components/steps/registry.tsx`. State screens (result, waiting, payment) share `StatusPanel` (icon/spinner + message + actions) so they look alike.

## Branch workflow

- `main`: stable / releases. `develop`: integration. **Never commit directly to either.**
- One feature = one branch = one PR, starting from `develop`: `feat/AF<n>-<short-slug>` (e.g. `feat/AF3-formik-integration`). Fixes: `fix/AF<n>-<slug>`. Chores: `chore/<slug>`.
- `AF<n>` is the issue number (use `.github/ISSUE_TEMPLATE`). No issue, no branch.
- Small, short-lived branches: a PR should be reviewable in one sitting. If it grows, split it.
- PRs target `develop` and use the full `.github/PULL_REQUEST_TEMPLATE.md`. `develop` → `main` only for releases.
- Before opening the PR: rebase/merge `develop`, clean `bun run lint`, story updated.
- Commits: `type: :emoji: description` in English (as in the history: `feat: :sparkles: ...`, `chore: :memo: ...`). One commit per logical change.
- Agents do not push, merge or open PRs unless explicitly asked.

## Code conventions

- Biome rules (`biome.jsonc`: 2 spaces, single quotes, `;`, trailing comma `all`, 80 columns). Run `bun run format` before committing; do not mix reformatting with functional changes.
- One component per folder, `export default`, with its `*.stories.tsx` next to it.
- Inputs: `forwardRef`, props typed with an `interface`, mandatory `id` + `label`, optional `className` merged through `cx()`. Basic accessibility is mandatory (`label htmlFor`, `aria-invalid`/`aria-describedby` on errors).
- Styles only in `src/styles/artisanform.css`, as single `af-*` classes (state through `data-*`/`aria-*`) and `--artisan-*` variables: no frameworks, no bare element selectors. Components get class names through `useCx()` so `classNames` and `unstyled` keep working. Tailwind is only used by the playground and Storybook.
- UI extension points (`components`, contracts in `components/ui/types.ts`) are public API: they never expose React Hook Form or Zustand. See `docs/ui.md`.
- Global state only in `useArtisanStore`; local UI state in the component. No hardcoded demo state inside components.
- Everything public is exported from `src/index.ts`.
- Keep it simple: no dependencies or abstractions without a concrete need.

## Definition of done

1. Meets the issue. 2. A story shows the states (default, error, disabled when applicable). 3. Lint and typecheck are clean. 4. Exported from `index.ts` if it is public API. 5. PR completed.

## Current state / known debt

Version `1.0.0-rc.2` (the core and the four npm kits, in lockstep) with the v1 schema contract: a wizard driven by a `scheme` (0.2.0 `FormSchema` or `ArtisanSchemaV1`) with extensible field and step registries, plugin-based payments (Stripe, Lemon Squeezy, Mercado Pago, PayPal), files through `StorageAdapter`, waiting through `WaitStrategy`, versioned draft snapshots, Biome, a playground and e2e tests. GitHub Actions CI runs lint, typecheck, build, package checks, unit tests, e2e on Chromium, Firefox and WebKit (with axe accessibility checks) and clean-app consumer tests on React 18 and 19 on every PR; a manual `Release` workflow publishes to npm ([`docs/releasing.md`](docs/releasing.md)). Pending: Trusted Publishing for npm, trying the payment plugins against sandboxes with test credentials, and a public headless API (internal `useWizard` is the starting point). Details and roadmap in the README.

Tasks are GitHub issues with the `AF<n>` code in the title (issue number = n − 6).

Test conventions: `*.test.ts(x)` next to the code with `bun test` (happy-dom + Testing Library, preload in `bunfig.toml`); real-browser flows in `e2e/` with Playwright against `bun run playground`. If the playground is already running and changes do not show up, restart it (HMR can go stale).

Non-negotiable principles: the library **never handles secrets or card data**; amounts, orders and upload signatures are resolved by the user's backend; third-party SDKs are optional peers in subpaths; the public schema contract stays serializable and independent of the form engine.
