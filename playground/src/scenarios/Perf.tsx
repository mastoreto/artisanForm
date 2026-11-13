import { ArtisanForm } from 'artisanform';
import { useEffect, useMemo } from 'react';
import { generateSchema } from '../../../perf/generate.mjs';

/**
 * A synthetic form for the performance spec (`e2e/perf.spec.ts`):
 * `?demo=perf&fields=50&perStep=50`. It marks when the form was first
 * rendered and when it was painted, so the spec can measure "schema in
 * memory → form ready" without the bundle download.
 */
const Perf = () => {
  const params = new URLSearchParams(location.search);
  const fields = Number(params.get('fields') ?? 50);
  const perStep = Number(params.get('perStep') ?? 8);
  const schema = useMemo(
    () => generateSchema(fields, 1, perStep),
    [fields, perStep],
  );
  performance.mark('af:render-start');
  useEffect(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        performance.mark('af:ready');
        document.documentElement.dataset.perfReady = 'true';
      }),
    );
  }, []);
  return <ArtisanForm scheme={schema} onSubmit={() => {}} />;
};

export default Perf;
