// Build time and bundle size with the React Compiler on vs off.
// Usage: node scripts/bench-build.mjs   (runs each mode 3 times, prints median)
import { execSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const size = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) =>
      n +
      (e.isDirectory()
        ? size(join(dir, e.name))
        : /\.(js|cjs|css)$/.test(e.name)
          ? statSync(join(dir, e.name)).size
          : 0),
    0,
  );
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

for (const mode of ['off', 'on']) {
  const times = [];
  let bytes = 0;
  for (let i = 0; i < 3; i++) {
    const t = performance.now();
    execSync('pnpm build', {
      stdio: 'ignore',
      env: { ...process.env, ARTISAN_COMPILER: mode },
    });
    times.push(Math.round(performance.now() - t));
    bytes = size('dist');
  }
  const gz = execSync('cat dist/*.js | gzip -c | wc -c').toString().trim();
  console.log(
    `compiler ${mode}: build ${median(times)} ms (median of 3), js+css ${bytes} B, es js gzip ${gz} B`,
  );
}
