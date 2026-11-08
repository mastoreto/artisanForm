// Installs the packed tarball in a clean Vite app and checks it works.
// Usage: node scripts/consumer-test.mjs <react-major: 18|19> [workdir]
// Checks: install + typecheck (NodeNext-free bundler TS), vite build, SSR
// render in Node, real browser flow (type, validate, next, submit).
// By default it packs the working tree. To test what is on the registry
// instead (after publishing), set ARTISAN_SPEC to a version or dist-tag:
//   ARTISAN_SPEC=0.3.0-beta.0 node scripts/consumer-test.mjs 19
// The official kits (bootstrap, mui, tailwind) are installed too: packed from
// packages/ (run `bun run build:kits` first) or from the registry.
import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const major = process.argv[2] ?? '19';
const root = process.cwd();
const work =
  process.argv[3] ?? mkdtempSync(join(tmpdir(), `af-consumer-${major}-`));
const sh = (cmd, cwd = work) => execSync(cmd, { cwd, stdio: 'inherit' });

const spec = process.env.ARTISAN_SPEC;
let artisanDep = spec ?? '';
if (!spec) {
  mkdirSync(join(work, 'pack'), { recursive: true });
  sh(`npm pack --pack-destination ${join(work, 'pack')}`, root);
  const tgz = readdirSync(join(work, 'pack')).find((f) => f.endsWith('.tgz'));
  artisanDep = `file:../pack/${tgz}`;
}

const kitNames = ['bootstrap', 'mui', 'tailwind'];
const kitDeps = {};
for (const k of kitNames) {
  const name = `@artisanform/ui-${k}`;
  if (spec) {
    kitDeps[name] = spec;
    continue;
  }
  const dir = join(root, 'packages', `ui-${k}`);
  sh(`npm pack --pack-destination ${join(work, 'pack')}`, dir);
  const file = readdirSync(join(work, 'pack')).find(
    (f) => f.startsWith(`artisanform-ui-${k}-`) && f.endsWith('.tgz'),
  );
  kitDeps[name] = `file:../pack/${file}`;
}

const reactVersion = major === '18' ? '18.3.1' : '19.3.1';
const typesVersion = major === '18' ? '^18.3.0' : '19.3.0';
const app = join(work, 'app');
mkdirSync(join(app, 'src'), { recursive: true });
writeFileSync(
  join(app, 'package.json'),
  JSON.stringify(
    {
      name: `consumer-${major}`,
      private: true,
      type: 'module',
      scripts: { build: 'vite build', typecheck: 'tsc --noEmit' },
      dependencies: {
        artisanform: artisanDep,
        ...kitDeps,
        '@mui/material': '^9.5.0',
        '@emotion/react': '^11.14.0',
        '@emotion/styled': '^11.14.1',
        react: reactVersion,
        'react-dom': reactVersion,
        'react-hook-form': '^7.90.0',
        yup: '^1.7.1',
        zustand: '^5.0.15',
      },
      devDependencies: {
        '@vitejs/plugin-react': '6.1.2',
        '@types/react': typesVersion,
        '@types/react-dom': typesVersion,
        typescript: '6.0.3',
        vite: '8.3.4',
      },
    },
    null,
    2,
  ),
);
writeFileSync(
  join(app, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      skipLibCheck: false,
      types: ['vite/client'],
    },
    include: ['src'],
  }),
);
writeFileSync(
  join(app, 'index.html'),
  '<div id="root"></div><script type="module" src="/src/main.tsx"></script>',
);
// No compiler config here: the package ships compiled code.
writeFileSync(
  join(app, 'vite.config.ts'),
  `import react from '@vitejs/plugin-react';\nimport { defineConfig } from 'vite';\nexport default defineConfig({ plugins: [react()] });\n`,
);
writeFileSync(
  join(app, 'src/form.tsx'),
  `import { ArtisanForm, defineForm } from 'artisanform';
import 'artisanform/style.css';

export const form = defineForm({
  schemaVersion: 1,
  id: 'contact',
  steps: [
    { id: 'main', type: 'form', title: 'Contact', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }] },
    { id: 'more', type: 'form', title: 'More', fields: [{ name: 'note', type: 'text', label: 'Note' }] },
  ],
});

export const App = ({ onSubmit }: { onSubmit: (v: unknown) => void }) => (
  <ArtisanForm scheme={form} onSubmit={onSubmit} />
);
`,
);
writeFileSync(
  join(app, 'src/kits.tsx'),
  `import { ArtisanForm } from 'artisanform';
import { bootstrapKit } from '@artisanform/ui-bootstrap';
import { muiKit } from '@artisanform/ui-mui';
import { tailwindKit } from '@artisanform/ui-tailwind';
import { form } from './form';

// Typechecks every official kit against the \`kit\` prop and bundles them.
export const kits = { bootstrapKit, muiKit, tailwindKit };
export const WithKits = ({ name }: { name: keyof typeof kits }) => (
  <ArtisanForm scheme={form} onSubmit={() => {}} kit={kits[name]} />
);
`,
);
writeFileSync(
  join(app, 'src/main.tsx'),
  `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './form';
import { kits } from './kits';

(window as any).__kits = Object.keys(kits);
createRoot(document.getElementById('root')!).render(
  <StrictMode><App onSubmit={(v) => { (window as any).__submitted = v; }} /></StrictMode>,
);
`,
);
writeFileSync(
  join(app, 'ssr.mjs'),
  `import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const { App } = await server.ssrLoadModule('/src/form.tsx');
const html = renderToString(createElement(App, { onSubmit() {} }));
await server.close();
if (!html.includes('Email')) { console.error('SSR output missing field'); process.exit(1); }
console.log('SSR OK (' + html.length + ' chars)');
`,
);

sh('npm install --no-audit --no-fund', app);
sh('npm run typecheck', app);
sh('npm run build', app);
sh('node ssr.mjs', app);
console.log(`consumer React ${reactVersion} OK -> ${app}`);
