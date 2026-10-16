import { useState } from 'react';
import { scenarios } from './scenarios';

const initial = () => {
  const demo = new URLSearchParams(location.search).get('demo');
  return demo && demo in scenarios ? demo : Object.keys(scenarios)[0];
};

/** Pick a scenario from the sidebar or with `?demo=<id>`. */
const App = () => {
  const [id, setId] = useState(initial);
  const Scenario = scenarios[id].component;

  const select = (next: string) => {
    setId(next);
    history.replaceState(null, '', `?demo=${next}`);
  };

  return (
    <div className="flex min-h-screen">
      <nav
        className="w-56 shrink-0 border-r bg-gray-50 p-4"
        aria-label="Escenarios"
      >
        <h1 className="mb-4 text-sm font-bold uppercase text-gray-500">
          Playground
        </h1>
        <ul className="space-y-1">
          {Object.entries(scenarios).map(([key, s]) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => select(key)}
                aria-current={key === id ? 'page' : undefined}
                className={`w-full rounded px-2 py-1 text-left text-sm ${
                  key === id ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-xl">
          <Scenario key={id} />
        </div>
      </main>
    </div>
  );
};

export default App;
