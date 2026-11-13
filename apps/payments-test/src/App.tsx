import {
  ArtisanForm,
  mockPayment,
  mockStorage,
  type PaymentPlugin,
} from 'artisanform';
import { useEffect, useMemo, useState } from 'react';
import { api, type Config } from './api';
import BuilderPage from './BuilderPage';
import { examples } from './catalog/examples';
import type { Ctx } from './catalog/types';
import { isKit, type KitId, kits, type LoadedKit } from './kits';
import { buildPlugins } from './payments';
import { panelFor, testData } from './testData';

const params = new URLSearchParams(location.search);
const kitId: KitId = isKit(params.get('kit'))
  ? (params.get('kit') as KitId)
  : 'default';
const isBuilder = params.get('ex') === 'builder';
const current = examples.find((e) => e.id === params.get('ex')) ?? examples[0];
const groups = [...new Set(examples.map((e) => e.group))];
const storage = mockStorage();

/** Kits and examples live in the URL: switching reloads, so global CSS never mixes. */
const go = (next: { ex?: string; kit?: string }) => {
  const q = new URLSearchParams({ ex: current.id, kit: kitId, ...next });
  location.assign(`${location.pathname}?${q}`);
};

/** Copies a value; says so for a moment. */
const CopyButton = ({ label, value }: { label: string; value: string }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1200);
          },
          () => {},
        );
      }}
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
};

/** Sandbox data for the methods that are paid ON this page, beside the form. */
const TestDataPanel = ({
  plugins,
  active,
}: {
  plugins: PaymentPlugin[];
  active: string | null;
}) => {
  const { shown, offsite } = panelFor(plugins, active);
  return (
    <aside className="panel" aria-label="Sandbox test data">
      <h3 className="panel-title">Test data</h3>
      <p className="panel-lead">Sandbox only: nothing real is charged.</p>
      {shown.map((p) => (
        <section key={p.id} className="panel-provider">
          <header className="panel-head">
            {p.icon ? (
              <span className="panel-logo" aria-hidden="true">
                {p.icon}
              </span>
            ) : null}
            <h4 className="panel-name">{p.name}</h4>
            <span className="badge on">Ready</span>
          </header>
          <dl className="panel-rows">
            {testData[p.id].rows.map((r) => (
              <div key={r.label} className="panel-row">
                <dt>{r.label}</dt>
                <dd>
                  {r.plain ? (
                    <span>{r.value}</span>
                  ) : (
                    <>
                      <code>{r.value}</code>
                      <CopyButton label={r.label} value={r.value} />
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {testData[p.id].note ? (
            <p className="panel-note">{testData[p.id].note}</p>
          ) : null}
        </section>
      ))}
      {offsite ? (
        <p className="panel-note">
          {offsite.name} takes you to its own page: use that provider&apos;s
          sandbox data there.
        </p>
      ) : null}
    </aside>
  );
};

const App = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [offline, setOffline] = useState(false);
  const [ui, setUi] = useState<LoadedKit | null>(null);
  const [result, setResult] = useState<unknown>(null);
  // The payment method the user picked (see payments.ts), for the side panel.
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    kits[kitId].load().then(setUi);
    // Without a backend the catalog still works, with the mock provider.
    api<Config>('/config').then(setConfig, () => setOffline(true));
  }, []);

  const key = `catalog:${current.id}`;
  const restart = () => {
    try {
      localStorage.removeItem(`artisanform:${key}`);
    } catch {}
    location.assign(location.href);
  };

  const built = useMemo(() => {
    if (!config && !offline) return null;
    const real = config ? buildPlugins(config, setActive) : [];
    const plugins = real.length ? real : [mockPayment()];
    const ctx: Ctx = { plugins, real: real.length > 0, restart };
    return { ...current.build(ctx), plugins, real: ctx.real };
  }, [config, offline]);

  const showPanel = !!current.payments && !!built?.real;

  return (
    <div className="shell">
      <nav className="side" aria-label="Examples">
        <h1 className="brand">
          Artisan<span>Form</span> catalog
        </h1>
        <label className="kit-picker">
          UI kit
          <select value={kitId} onChange={(e) => go({ kit: e.target.value })}>
            {Object.entries(kits).map(([id, k]) => (
              <option key={id} value={id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <section>
          <h2 className="group-title">Tools</h2>
          <ul className="group-list">
            <li>
              <a
                className="nav-link-ex"
                href={`?ex=builder&kit=${kitId}`}
                aria-current={isBuilder ? 'page' : undefined}
              >
                Visual form builder
              </a>
            </li>
          </ul>
        </section>
        {groups.map((g) => (
          <section key={g}>
            <h2 className="group-title">{g}</h2>
            <ul className="group-list">
              {examples
                .filter((e) => e.group === g)
                .map((e) => (
                  <li key={e.id}>
                    <a
                      className="nav-link-ex"
                      href={`?ex=${e.id}&kit=${kitId}`}
                      aria-current={
                        !isBuilder && e.id === current.id ? 'page' : undefined
                      }
                    >
                      {e.title}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className={showPanel || isBuilder ? 'content wide' : 'content'}>
        {isBuilder
          ? ui && (
              <div className={ui.className}>
                <BuilderPage kit={ui.kit} />
              </div>
            )
          : null}
        {isBuilder ? null : (
          <>
            <header className="hero">
              <h2>{current.title}</h2>
              <p>{current.summary}</p>
              <p className="tags">
                {current.features.map((f) => (
                  <code key={f} className="tag">
                    {f}
                  </code>
                ))}
              </p>
            </header>
            {current.payments && offline && (
              <p role="status" className="notice">
                Backend not running: using the mock provider. Start it with{' '}
                <code>bun run dev</code> to try the sandboxes.
              </p>
            )}
            <div className={showPanel ? 'workspace has-aside' : 'workspace'}>
              {built && ui && (
                <div className={`stage ${ui.className ?? ''}`}>
                  <ArtisanForm
                    key={`${kitId}:${current.id}`}
                    scheme={built.scheme}
                    extensions={built.extensions}
                    plugins={{ payments: built.plugins }}
                    storage={storage}
                    kit={ui.kit}
                    persistKey={key}
                    onSubmit={(values) => setResult(values)}
                  />
                </div>
              )}
              {showPanel && built ? (
                <TestDataPanel plugins={built.plugins} active={active} />
              ) : null}
            </div>
            <button type="button" className="ghost" onClick={restart}>
              Reset draft
            </button>
            {result !== null && (
              <pre className="result">{JSON.stringify(result, null, 2)}</pre>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;
