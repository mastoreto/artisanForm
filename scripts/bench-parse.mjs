// Micro-benchmark of the CPU part of loading a form: parse, normalize and
// project a schema that is already in memory (what the wizard runs in its
// first `useMemo`), plus the initial values and the Yup schema built from it. It is a diagnostic for finding costs and catching
// regressions; the product standard is the Web Vitals budget (see the plan,
// section G), not these numbers.
//   bun run scripts/bench-parse.mjs                 # table
//   bun run scripts/bench-parse.mjs --json          # machine-readable
//   bun run scripts/bench-parse.mjs --write-baseline  # writes perf/baseline.json
// Each time is divided by a fixed reference workload measured in the same
// process, so the ratio is comparable between machines.
import { writeFileSync } from 'node:fs';
import os from 'node:os';
import { generateSchema, SIZES } from '../perf/generate.mjs';
import {
  buildInitialValues,
  buildValidationSchema,
} from '../src/engine/buildSchema';
import { projectToRuntime } from '../src/engine/project';
import { NATIVE_FIELD_TYPES, parseArtisanSchema } from '../src/schema';
import { normalizeArtisanSchema } from '../src/schema/normalize';

const WARMUP = 300;
const SAMPLES = 200;
const registries = {
  fieldTypes: [...NATIVE_FIELD_TYPES],
  stepKinds: ['terms', 'payment', 'pending', 'review', 'result', 'custom'],
};

const stats = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return {
    median: s[Math.floor(s.length / 2)],
    p95: s[Math.floor(s.length * 0.95)],
    min: s[0],
  };
};

const time = (fn) => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};

const measure = (fn) => {
  const cold = time(fn);
  for (let i = 0; i < WARMUP; i++) fn();
  return { cold, ...stats(Array.from({ length: SAMPLES }, () => time(fn))) };
};

// Fixed deterministic workload: its median is the unit of the ratios.
const reference = () =>
  measure(() =>
    Array.from({ length: 20000 }, (_, i) => (i * 2654435761) % 1000).sort(
      (a, b) => a - b,
    ),
  ).median;

const run = () => {
  const ref = reference();
  const rows = [];
  for (const fields of SIZES) {
    const schema = generateSchema(fields);
    const parsed = parseArtisanSchema(schema);
    if (!parsed.success)
      throw new Error(
        `synthetic ${fields} is invalid: ${JSON.stringify(parsed.issues[0])}`,
      );
    const normalized = normalizeArtisanSchema(schema);
    const runtime = projectToRuntime(normalized, undefined, registries).scheme;
    const stages = {
      parse: measure(() => parseArtisanSchema(schema)),
      normalize: measure(() => normalizeArtisanSchema(schema)), // includes parse + clone
      project: measure(() =>
        projectToRuntime(normalized, undefined, registries),
      ),
      pipeline: measure(() =>
        projectToRuntime(normalizeArtisanSchema(schema), undefined, registries),
      ),
      // What the wizard builds next from the projection (Yup, one schema per field).
      initialValues: measure(() => buildInitialValues(runtime)),
      yup: measure(() => buildValidationSchema(runtime)),
    };
    for (const [stage, v] of Object.entries(stages))
      rows.push({ fields, stage, ...v, ratio: v.median / ref });
  }
  return {
    node: process.versions.bun
      ? `bun ${process.versions.bun}`
      : process.version,
    cpu: os.cpus()[0]?.model,
    referenceMs: ref,
    warmup: WARMUP,
    samples: SAMPLES,
    rows,
  };
};

const result = run();
const f = (x) => x.toFixed(3);
if (process.argv.includes('--json'))
  console.log(JSON.stringify(result, null, 2));
else {
  console.log(
    `${result.node} | ${result.cpu} | reference ${f(result.referenceMs)} ms`,
  );
  console.log('fields  stage       cold     median   p95      min      ratio');
  for (const r of result.rows)
    console.log(
      `${String(r.fields).padEnd(7)} ${r.stage.padEnd(11)} ${f(r.cold).padStart(7)}  ${f(r.median).padStart(7)}  ${f(r.p95).padStart(7)}  ${f(r.min).padStart(7)}  ${f(r.ratio).padStart(6)}`,
    );
}
if (process.argv.includes('--write-baseline')) {
  writeFileSync('perf/baseline.json', `${JSON.stringify(result, null, 2)}\n`);
  console.log('wrote perf/baseline.json');
}
