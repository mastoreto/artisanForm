import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, type Page, test } from '@playwright/test';

// Performance of the form against the Core Web Vitals / RAIL budgets, on the
// production build of the playground (see playwright.config.ts). The library
// does not control the network, so it is measured from "the schema is in
// memory" to "the form is painted and editable", and per interaction.
//
// Budgets (p75 in the standard; here the median of several runs):
//   ready        desktop <= 100 ms   mobile <= 300 ms   (RAIL response)
//                Firefox and WebKit <= 400 ms: a cold first render with no
//                warm JIT, measured unthrottled on a CI-class machine (observed
//                130-260 ms); they are also held to perf/web-baseline.json
//   interaction  desktop <= 100 ms   mobile <= 200 ms   (INP "good" is 200 ms)
//   long task    none > 50 ms during load, scaled by the CPU slowdown on the
//                mobile profile (Chromium only: others lack the API)
//   CLS          <= 0.1              (Chromium only)
// A 200-field schema gets twice the room. Firefox and WebKit cannot throttle
// the CPU, so the mobile profile only applies in Chromium.
const RUNS = 7;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

const mobile = (name: string) => name.endsWith('mobile');
const budget = (
  project: string,
  ms: { desktop: number; mobile: number; other?: number },
) =>
  mobile(project)
    ? ms.mobile
    : /firefox|webkit/.test(project)
      ? (ms.other ?? ms.desktop)
      : ms.desktop;

const results: Record<string, unknown> = {};

// Medians recorded on a known-good run, per project (written from PERF_OUT
// files by hand on purpose: raising it is a deliberate commit). A run fails
// when it is 50% (+30 ms of noise) slower than that.
const baseline: Record<string, Record<string, number>> = existsSync(
  'perf/web-baseline.json',
)
  ? JSON.parse(readFileSync('perf/web-baseline.json', 'utf8'))
  : {};

test.afterAll(() => {
  // PERF_OUT=perf-results: one file per project, e.g. perf-results.perf-webkit.json
  if (process.env.PERF_OUT)
    writeFileSync(
      `${process.env.PERF_OUT}.${test.info().project.name}.json`,
      JSON.stringify(results, null, 2),
    );
});

/** Slows the CPU 4x on the mobile profile (Chromium only). */
const throttle = async (page: Page, project: string) => {
  if (!mobile(project)) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
};

const open = async (page: Page, fields: number, perStep: number) => {
  await page.addInitScript(() => {
    (window as unknown as { __long: number[][]; __cls: number }).__long = [];
    (window as unknown as { __cls: number }).__cls = 0;
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          (window as unknown as { __long: number[][] }).__long.push([
            e.startTime,
            e.duration,
          ]);
      }).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[])
          if (!e.hadRecentInput)
            (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {} // Firefox/WebKit: no longtask or layout-shift
  });
  await page.goto(`/?demo=perf&fields=${fields}&perStep=${perStep}`);
  await page.waitForSelector('html[data-perf-ready="true"]');
};

const readyMs = (page: Page) =>
  page.evaluate(() => {
    const start = performance.getEntriesByName('af:render-start')[0];
    const ready = performance.getEntriesByName('af:ready')[0];
    return ready.startTime - start.startTime;
  });

// In-page timing: the same code in every engine, no Playwright round trip in
// the number. `act` runs, then we wait for the predicate to hold and a paint.
const interact = (page: Page, act: string, until: string): Promise<number> =>
  page.evaluate(
    ([a, u]) =>
      new Promise<number>((resolve) => {
        const t0 = performance.now();
        new Function(a)();
        const check = () =>
          new Function(`return (${u})`)()
            ? requestAnimationFrame(() => resolve(performance.now() - t0))
            : requestAnimationFrame(check);
        check();
      }),
    [act, until] as const,
  );

const sizes = [
  { fields: 50, perStep: 8, factor: 1, label: '50 fields in steps of 8' },
  { fields: 50, perStep: 50, factor: 1, label: '50 fields in one step' },
  { fields: 200, perStep: 8, factor: 2, label: '200 fields in steps of 8' },
];

for (const s of sizes) {
  test(`ready: ${s.label}`, async ({ page }, info) => {
    const project = info.project.name;
    await throttle(page, project);
    const samples: number[] = [];
    for (let i = 0; i < RUNS; i++) {
      await open(page, s.fields, s.perStep);
      samples.push(await readyMs(page));
    }
    const m = median(samples);
    results[`ready ${s.label}`] = { median: m, samples };
    expect(m).toBeLessThanOrEqual(
      budget(project, { desktop: 100, mobile: 300, other: 400 }) * s.factor,
    );
    const base = baseline[project]?.[s.label];
    if (base !== undefined) expect(m).toBeLessThanOrEqual(base * 1.5 + 30);
  });
}

test('load: no long task over 50 ms and no layout shift (Chromium)', async ({
  page,
  browserName,
}, info) => {
  test.skip(
    browserName !== 'chromium',
    'longtask and layout-shift are Chromium APIs',
  );
  await throttle(page, info.project.name);
  await open(page, 50, 8);
  // Only tasks that start once the form began to render: script evaluation of
  // the playground bundle (kits, Material UI) before that is not the library.
  const { long, cls } = await page.evaluate(() => {
    const start =
      performance.getEntriesByName('af:render-start')[0]?.startTime ?? 0;
    return {
      long: (window as unknown as { __long: number[][] }).__long
        .filter(([at]) => at >= start)
        .map(([, d]) => d),
      cls: (window as unknown as { __cls: number }).__cls,
    };
  });
  results.load = { longTasks: long, cls };
  // The first render of a framework app can exceed 50 ms once on a throttled
  // CPU; what must not happen is a long task that scales with the form.
  const limit = mobile(info.project.name) ? 50 * 4 * 1.5 : 50;
  expect(Math.max(0, ...long)).toBeLessThanOrEqual(limit);
  expect(cls).toBeLessThanOrEqual(0.1);
});

test('interaction: typing, conditional fields and Next', async ({
  page,
}, info) => {
  const project = info.project.name;
  await throttle(page, project);
  await open(page, 50, 8);
  const type = `
    const el = document.querySelector('input[type="text"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, el.value + 'x');
    el.dispatchEvent(new Event('input', { bubbles: true }));`;
  const typed: number[] = [];
  for (let i = 0; i < 20; i++)
    typed.push(
      await interact(
        page,
        type,
        `document.querySelector('input[type="text"]').value.length === ${i + 1}`,
      ),
    );

  // Next with a valid first step: fill the required fields, then time the move.
  await page.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    for (const el of document.querySelectorAll<HTMLInputElement>(
      'input[type="text"],input[type="email"]',
    )) {
      set?.call(el, el.type === 'email' ? 'a@b.co' : 'xx');
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    for (const r of document.querySelectorAll<HTMLInputElement>(
      'input[type="radio"][value="a"]',
    ))
      r.click();
  });
  const next = await interact(
    page,
    `[...document.querySelectorAll('button')].find((b) => b.textContent === 'Next').click()`,
    `document.body.textContent.includes('Step 2')`,
  );

  const typedMedian = median(typed);
  results.interaction = { typedMedian, typedMax: Math.max(...typed), next };
  const limit = budget(project, { desktop: 100, mobile: 200 });
  expect(typedMedian).toBeLessThanOrEqual(limit);
  expect(next).toBeLessThanOrEqual(limit * 2); // Next also validates
});
