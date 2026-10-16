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
    <div className="flex min-h-screen flex-col md:flex-row">
      <nav
        className="shrink-0 border-b bg-gray-50 p-4 md:w-56 md:border-b-0 md:border-r"
        aria-label="Escenarios"
      >
        <h1 className="mb-4 text-sm font-bold uppercase text-gray-500">
          Playground
        </h1>
        <ul className="flex flex-wrap gap-1 md:block md:space-y-1">
          {Object.entries(scenarios).map(([key, s]) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => select(key)}
                aria-current={key === id ? 'page' : undefined}
                className={`rounded px-2 py-1 text-left text-sm md:w-full ${
                  key === id ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-100'
                }`}
              >
                {s.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-xl">
          <Scenario key={id} />
        </div>
      </main>
    </div>
  );
};

export default App;
