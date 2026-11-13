// vite-plugin-dts keeps source specifiers (`./foo`), which Node16/NodeNext
// consumers cannot resolve. Rewrites relative specifiers in dist/**/*.d.ts to
// explicit `./foo.js` or `./foo/index.js`.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : e.name.endsWith('.d.ts')
        ? [join(dir, e.name)]
        : [],
  );

let changed = 0;
for (const file of walk('dist')) {
  const src = readFileSync(file, 'utf8');
  const out = src.replace(
    /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])(\.{1,2}(?:\/[^'"]*)?)\2/g,
    (all, pre, q, spec) => {
      if (/\.(js|css|json)$/.test(spec)) return all;
      const abs = resolve(dirname(file), spec);
      if (existsSync(`${abs}.d.ts`)) return `${pre}${q}${spec}.js${q}`;
      if (existsSync(join(abs, 'index.d.ts')))
        return `${pre}${q}${spec.replace(/\/$/, '')}/index.js${q}`;
      throw new Error(`${file}: cannot resolve "${spec}"`);
    },
  );
  if (out !== src) {
    writeFileSync(file, out);
    changed++;
  }
}
console.log(`fix-dts: rewrote ${changed} declaration file(s)`);

// TypeScript 6 checks side-effect imports, so `import 'artisanform/style.css'`
// needs a declaration (Vite and Next 16 supply `*.css` typings, Next 15 does not).
writeFileSync('dist/style.css.d.ts', 'export {};\n');
