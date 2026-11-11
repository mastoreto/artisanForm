import { ArtisanForm, mockPayment, mockStorage } from 'artisanform';
import { useEffect, useMemo, useState } from 'react';
import { api, type Config } from './api';
import { examples } from './catalog/examples';
import type { Ctx } from './catalog/types';
import { isKit, type KitId, kits, type LoadedKit } from './kits';
import { buildPlugins, hints } from './payments';

const params = new URLSearchParams(location.search);
const kitId: KitId = isKit(params.get('kit'))
  ? (params.get('kit') as KitId)
  : 'default';
const current = examples.find((e) => e.id === params.get('ex')) ?? examples[0];
const groups = [...new Set(examples.map((e) => e.group))];
const storage = mockStorage();

/** Kits and examples live in the URL: switching reloads, so global CSS never mixes. */
const go = (next: { ex?: string; kit?: string }) => {
  const q = new URLSearchParams({ ex: current.id, kit: kitId, ...next });
  location.assign(`${location.pathname}?${q}`);
};

const names: Record<string, string> = {
  stripe: 'Stripe',
  paypal: 'PayPal',
  mercadopago: 'Mercado Pago',
  lemonsqueezy: 'Lemon Squeezy',
};

const ProviderStatus = ({ config }: { config: Config }) => (
  <ul className="providers">
    {(Object.keys(hints) as (keyof Config)[]).map((id) => (
      <li key={id} className="provider">
        <div className="provider-head">
          <span className="provider-name">{names[id] ?? id}</span>
          <span className={`badge ${config[id] ? 'on' : 'off'}`}>
            {config[id] ? 'Ready' : 'Not set'}
          </span>
        </div>
        <p className="provider-hint">{hints[id]}</p>
      </li>
    ))}
  </ul>
);

const App = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [offline, setOffline] = useState(false);
  const [ui, setUi] = useState<LoadedKit | null>(null);
  const [result, setResult] = useState<unknown>(null);

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
    const real = config ? buildPlugins(config) : [];
    const plugins = real.length ? real : [mockPayment()];
    const ctx: Ctx = { plugins, real: real.length > 0, restart };
    return { ...current.build(ctx), plugins };
  }, [config, offline]);

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
                      aria-current={e.id === current.id ? 'page' : undefined}
                    >
                      {e.title}
                    </a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </nav>
      <main className="content">
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
        {current.payments && config && <ProviderStatus config={config} />}
        {current.payments && offline && (
          <p role="status" className="notice">
            Backend not running: using the mock provider. Start it with{' '}
            <code>bun run dev</code> to try the sandboxes.
          </p>
        )}
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
        <button type="button" className="ghost" onClick={restart}>
          Reset draft
        </button>
        {result !== null && (
          <pre className="result">{JSON.stringify(result, null, 2)}</pre>
        )}
      </main>
    </div>
  );
};

export default App;
