// Installs the packed tarball in a clean Next.js app that uses BOTH routers and
// checks the library works in each: `next build` (typecheck included), the
// server-rendered HTML, and a real browser (hydration, validation, Next, submit).
// Usage: node scripts/consumer-next.mjs [workdir]
//   NEXT_VERSION=16.4.3   Next version (default: the one EventosSaaS uses)
//   ARTISAN_SPEC=1.0.0    test the registry instead of the working tree
//
// Routes:
//   /app-wrapped   App Router: server page -> its own 'use client' wrapper
//   /app-direct    App Router: ArtisanForm used straight from a Server Component,
//                  with a server action as onSubmit (needs the 'use client'
//                  directive the package ships)
//   /app-schema    App Router: `artisanform/schema` called on the server
//   /pages-router  Pages Router: a normal page (SSR + hydration)
import { execSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const work = process.argv[2] ?? mkdtempSync(join(tmpdir(), 'af-next-'));
const nextVersion = process.env.NEXT_VERSION ?? '16.4.3';
const port = process.env.PORT ?? '3187';
const sh = (cmd, cwd = work) => execSync(cmd, { cwd, stdio: 'inherit' });

const spec = process.env.ARTISAN_SPEC;
let artisanDep = spec ?? '';
if (!spec) {
  mkdirSync(join(work, 'pack'), { recursive: true });
  sh(`npm pack --pack-destination ${join(work, 'pack')}`, root);
  const tgz = readdirSync(join(work, 'pack')).find((f) => f.endsWith('.tgz'));
  artisanDep = `file:../pack/${tgz}`;
}

const app = join(work, 'app');
const write = (file, content) => {
  const path = join(app, file);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
};

write(
  'package.json',
  JSON.stringify(
    {
      name: 'consumer-next',
      private: true,
      scripts: { build: 'next build', start: `next start -p ${port}` },
      dependencies: {
        artisanform: artisanDep,
        next: nextVersion,
        react: '19.3.1',
        'react-dom': '19.3.1',
        'react-hook-form': '^7.90.0',
        yup: '^1.7.1',
        zustand: '^5.0.15',
      },
      devDependencies: {
        '@types/node': '^24.0.0',
        '@types/react': '19.3.0',
        '@types/react-dom': '19.3.0',
        typescript: '6.0.3',
      },
    },
    null,
    2,
  ),
);
write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      lib: ['dom', 'dom.iterable', 'esnext'],
      module: 'esnext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      noEmit: true,
      incremental: true,
      skipLibCheck: false,
      isolatedModules: true,
      esModuleInterop: true,
      plugins: [{ name: 'next' }],
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules'],
  }),
);
write('next.config.mjs', 'export default {};\n');

// Server-safe: only `artisanform/schema`, no React.
write(
  'form.ts',
  `import { defineForm } from 'artisanform/schema';

export const form = defineForm({
  schemaVersion: 1,
  id: 'contact',
  steps: [
    { id: 'main', type: 'form', title: 'Contact', fields: [{ name: 'email', type: 'email', label: 'Email', required: true }] },
    { id: 'more', type: 'form', title: 'More', fields: [{ name: 'note', type: 'text', label: 'Note' }] },
  ],
});
`,
);

// ---- App Router
write(
  'app/layout.tsx',
  `import 'artisanform/style.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,
);
write(
  'app/app-wrapped/Client.tsx',
  `'use client';
import { ArtisanForm } from 'artisanform';
import { form } from '../../form';

export default function Client() {
  return (
    <ArtisanForm
      scheme={form}
      onSubmit={(v) => {
        (window as unknown as { __submitted: unknown }).__submitted = v;
      }}
    />
  );
}
`,
);
write(
  'app/app-wrapped/page.tsx',
  `import Client from './Client';

export default function Page() {
  return <Client />;
}
`,
);
write(
  'app/app-direct/page.tsx',
  `import { ArtisanForm } from 'artisanform';
import { form } from '../../form';

// A Server Component using the library directly. The submit handler is a
// server action: it runs on the server and the browser only gets a reference.
async function save(values: unknown) {
  'use server';
  console.log('server action received', JSON.stringify(values));
}

export default function Page() {
  return <ArtisanForm scheme={form} onSubmit={save} />;
}
`,
);
write(
  'app/app-schema/page.tsx',
  `import { validateValues } from 'artisanform/schema';
import { form } from '../../form';

// \`artisanform/schema\` must stay usable in a Server Component.
export default function Page() {
  const bad = validateValues(form, { email: 'not-an-email' });
  const good = validateValues(form, { email: 'a@b.co' });
  return (
    <p data-testid="result">
      bad:{String(bad.ok)} good:{String(good.ok)}
    </p>
  );
}
`,
);

// ---- Pages Router
write(
  'pages/_app.tsx',
  `import 'artisanform/style.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
`,
);
write(
  'pages/pages-router.tsx',
  `import { ArtisanForm } from 'artisanform';
import { form } from '../form';

export default function Page() {
  return (
    <ArtisanForm
      scheme={form}
      onSubmit={(v) => {
        (window as unknown as { __submitted: unknown }).__submitted = v;
      }}
    />
  );
}
`,
);

sh('npm install --no-audit --no-fund', app);
sh('npx next build', app);

// `node next` (not `npx next`): killing the npx wrapper would leave the server up.
const server = spawn(
  process.execPath,
  [join(app, 'node_modules/next/dist/bin/next'), 'start', '-p', port],
  { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] },
);
let serverLog = '';
server.stdout.on('data', (d) => {
  serverLog += d;
});
server.stderr.on('data', (d) => {
  serverLog += d;
});
const stop = () => server.kill();
const fail = (msg) => {
  stop();
  console.error('FAIL:', msg);
  console.error(serverLog.split('\n').slice(-15).join('\n'));
  process.exit(1);
};

try {
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(base);
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // 1. Server-rendered HTML.
  for (const route of ['app-wrapped', 'app-direct', 'pages-router']) {
    const html = await (await fetch(`${base}/${route}`)).text();
    if (!html.includes('Email'))
      fail(`/${route}: SSR HTML has no "Email" field`);
    console.log(`SSR OK /${route}`);
  }
  const schemaHtml = (await (await fetch(`${base}/app-schema`)).text()).replace(
    /<!-- -->/g,
    '',
  );
  if (!/bad:false/.test(schemaHtml) || !/good:true/.test(schemaHtml))
    fail('/app-schema: validateValues did not run on the server');
  console.log('server validateValues OK /app-schema');

  // 2. Browser: hydration, validation, Next, submit.
  const browser = await chromium.launch();
  for (const route of ['app-wrapped', 'pages-router']) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto(`${base}/${route}`);
    await page.getByLabel('Email').waitFor();
    await page.getByRole('button', { name: /next/i }).click();
    await page
      .getByText(/required/i)
      .first()
      .waitFor({ timeout: 5000 });
    await page.getByLabel('Email').fill('a@b.co');
    await page.getByRole('button', { name: /next/i }).click();
    await page.getByLabel('Note').fill('hi');
    await page.getByRole('button', { name: /finish/i }).click();
    await page.waitForFunction(() => window.__submitted, null, {
      timeout: 5000,
    });
    const v = await page.evaluate(() => window.__submitted);
    if (v.email !== 'a@b.co' || v.note !== 'hi')
      fail(`/${route}: bad values ${JSON.stringify(v)}`);
    if (errors.length) fail(`/${route}: ${errors.join(' | ')}`);
    console.log(`browser OK /${route}`);
    await page.close();
  }

  // 3. Server action from a Server Component: the server must receive the values.
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/app-direct`);
  await page.getByLabel('Email').fill('a@b.co');
  await page.getByRole('button', { name: /next/i }).click();
  await page.getByLabel('Note').fill('hi');
  await page.getByRole('button', { name: /finish/i }).click();
  await new Promise((r) => setTimeout(r, 1500));
  if (!/server action received .*a@b\.co/.test(serverLog))
    fail('/app-direct: the server action did not receive the values');
  if (errors.length) fail(`/app-direct: ${errors.join(' | ')}`);
  console.log('server action OK /app-direct');
  await browser.close();
} catch (e) {
  fail(e.message);
}
stop();
console.log(`consumer Next ${nextVersion} OK -> ${app}`);
