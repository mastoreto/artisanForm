import { defineConfig, devices } from '@playwright/test';

// Locally only Chromium runs. CI sets ARTISAN_BROWSERS to add Firefox and
// WebKit (e.g. ARTISAN_BROWSERS=chromium,firefox,webkit).
const wanted = (process.env.ARTISAN_BROWSERS ?? 'chromium')
  .split(',')
  .map((b) => b.trim());
const all = {
  chromium: devices['Desktop Chrome'],
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
} as const;
const names = wanted.filter((n): n is keyof typeof all => n in all);

// Performance runs against the production build of the playground
// (`bun run playground:build`, served on 5175), never the dev server. The
// mobile profile is Chromium with the CPU slowed 4x (see e2e/perf.spec.ts);
// Firefox and WebKit cannot throttle the CPU, so they only get the phone
// viewport and touch.
const perf = [
  ...names.map((name) => ({ name: `perf-${name}`, device: all[name] })),
  ...(names.includes('chromium')
    ? [{ name: 'perf-chromium-mobile', device: devices['Pixel 7'] }]
    : []),
].map(({ name, device }) => ({
  name,
  testMatch: /perf\.spec\.ts/,
  use: { ...device, baseURL: 'http://localhost:5175' },
  // One at a time: parallel workers would compete for the CPU being measured.
  fullyParallel: false,
}));

// `bun run perf` (ARTISAN_PERF=1) runs only the performance projects; the
// functional `bun run e2e` never does, so CI noise cannot fail a flow test.
const perfOnly = !!process.env.ARTISAN_PERF;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5173' },
  projects: perfOnly
    ? perf
    : names.map((name) => ({
        name,
        testIgnore: /perf\.spec\.ts/,
        use: all[name],
      })),
  webServer: perfOnly
    ? [
        {
          command: 'bun run playground:build && bun run playground:preview',
          url: 'http://localhost:5175',
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ]
    : [
        {
          command: 'bun run playground',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
        },
      ],
});
