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

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5173' },
  projects: wanted
    .filter((name): name is keyof typeof all => name in all)
    .map((name) => ({ name, use: all[name] })),
  webServer: {
    command: 'bun run playground',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
