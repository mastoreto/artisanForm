# Performance

Spanish version: [es/performance.md](es/performance.md).

ArtisanForm is measured against Google's **Core Web Vitals** and **RAIL** thresholds, not against an internal number. A library does not control the network or the page's LCP, so it is measured on what it does control: from "the schema is in memory" to "the form is painted and editable", and the cost of each interaction.

## Budgets (`e2e/perf.spec.ts`)

| What | Desktop | Mobile (Chromium, CPU 4x) | Firefox / WebKit | Based on |
|---|---|---|---|---|
| Form ready (50 fields; 200 fields get double) | ≤ 100 ms | ≤ 300 ms | ≤ 400 ms | RAIL "respond in 100 ms" |
| Interaction (type, Next) | ≤ 100 ms (Next ≤ 200) | ≤ 200 ms (Next ≤ 400) | same as desktop | INP "good" is 200 ms |
| Long tasks once the form renders | ≤ 50 ms | ≤ 300 ms (50 ms × 4 CPU × 1.5) | not measurable | RAIL / TBT |
| Layout shift (CLS) | ≤ 0.1 | ≤ 0.1 | not measurable | Core Web Vitals |
| Gzipped JS / CSS / `artisanform/schema` | no more than +10% over `perf/size.json` | | | own budget |

Firefox and WebKit cannot throttle the CPU in Playwright and expose no `longtask` or `layout-shift` entries, so they get the "ready" and interaction budgets only. Their "ready" budget is looser because a cold first render in them is slower on the same machine (130–260 ms observed).

Each "ready" median is also held to `perf/web-baseline.json`: a run fails when it is 50% (+30 ms) slower than the recorded median for that browser. Raising a baseline is a deliberate commit.

## Running it

```bash
bun run perf                                   # Chromium, desktop + mobile profile
ARTISAN_BROWSERS=chromium,firefox,webkit bun run perf
PERF_OUT=perf-results bun run perf             # also writes perf-results.<project>.json
bun run build && bun run check:size            # bundle size gate (--write to move the baseline)
bun run bench:parse                            # CPU part only (parse, normalize, project, Yup)
```

It runs against the **production build** of the playground (`bun run playground:build`, served on 5175) and one test at a time. The synthetic schemas come from `perf/generate.mjs` (deterministic). In CI the `perf` job runs it per browser and uploads the JSON.

## What the numbers say (Chromium, Ryzen 7 5700X)

- Parsing, normalizing, projecting and building the Yup schema of a **200-field** schema cost about **1.2 ms** together (`perf/baseline.json`); the time to be ready is React rendering, not the schema pipeline.
- Ready: 25–40 ms desktop, about 100–140 ms with the CPU slowed 4x. Typing a character: about 13 ms.
- Nothing in these numbers pointed at code to optimize, so none was changed. Keep `scheme` referentially stable in the parent (`useMemo` or a module constant): a new object each render repeats the ~1 ms pipeline.
