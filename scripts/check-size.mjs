// Bundle size gate: gzipped JS and CSS of the library entries after `bun run build`,
// compared with perf/size.json. Growth over 10% fails; update the baseline
// deliberately with --write.
//   node scripts/check-size.mjs [--write]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT = 1.1;
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
const gz = (files) =>
  files.reduce((n, f) => n + gzipSync(readFileSync(f)).length, 0);

// The entry plus every local chunk it imports (transitively).
const closure = (entry, seen = new Set()) => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const src = readFileSync(entry, 'utf8');
  for (const m of src.matchAll(/from\s*["'](\.[^"']+)["']/g))
    closure(join(entry, '..', m[1]), seen);
  return seen;
};

const files = walk('dist');
// What only the builder entry loads: its closure minus what the other entries
// already load. It is optional, so it has its own budget and does not count
// against the rest of the library.
const others = new Set(
  files
    .filter((f) =>
      /^dist\/(index|headless|schema|payments\/[^/]+)\.js$/.test(
        f.replaceAll('\\', '/'),
      ),
    )
    .flatMap((f) => [...closure(f)]),
);
const builderOnly = [...closure('dist/builder.js')].filter(
  (f) => !others.has(f),
);
const sizes = {
  // Everything a consumer of the root entry may download (the builder is apart).
  js: gz(files.filter((f) => /\.js$/.test(f) && !builderOnly.includes(f))),
  css: gz(files.filter((f) => /\.css$/.test(f) && !f.endsWith('builder.css'))),
  // The server-side entry must stay small: it is what a backend loads.
  schema: gz([...closure('dist/schema.js')]),
  // The optional visual builder, on top of the root entry.
  builder: gz([...builderOnly, 'dist/builder.css']),
};

if (process.argv.includes('--write')) {
  writeFileSync('perf/size.json', `${JSON.stringify(sizes, null, 2)}\n`);
  console.log('wrote perf/size.json', sizes);
} else {
  const base = JSON.parse(readFileSync('perf/size.json', 'utf8'));
  let bad = 0;
  for (const [k, v] of Object.entries(sizes)) {
    const ok = v <= base[k] * LIMIT;
    if (!ok) bad++;
    console.log(
      `${ok ? 'ok ' : 'BIG'} ${k}: ${v} B gzip (baseline ${base[k]}, ${((v / base[k] - 1) * 100).toFixed(1)}%)`,
    );
  }
  if (bad) process.exit(1);
}
