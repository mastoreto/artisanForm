import { expect, test } from 'bun:test';
import { LABEL_PARAMS, labelsFromCatalogs } from '../i18n';
import { defaultLabels } from '../labels';

test('LABEL_PARAMS covers exactly the function labels, with the right arity', () => {
  const fns = Object.entries(defaultLabels).filter(
    ([, v]) => typeof v === 'function',
  );
  expect(Object.keys(LABEL_PARAMS).sort()).toEqual(fns.map(([k]) => k).sort());
  for (const [k, fn] of fns)
    expect((fn as (...a: never[]) => string).length).toBe(
      LABEL_PARAMS[k as keyof typeof LABEL_PARAMS].length,
    );
});

test('plain and templated labels, most specific catalog first', () => {
  const l = labelsFromCatalogs(
    [
      { 'labels.next': 'Siguiente (AR)' },
      {
        'labels.next': 'Siguiente',
        'labels.previous': 'Anterior',
        'labels.step': 'Paso {n} de {total}: {title}',
        'labels.nope': 'x',
      },
    ],
    'es-AR',
  ) as Record<string, unknown>;
  expect(l.next).toBe('Siguiente (AR)');
  expect(l.previous).toBe('Anterior');
  expect((l.step as (...a: unknown[]) => string)(2, 5, 'Datos')).toBe(
    'Paso 2 de 5: Datos',
  );
  expect(l.submit).toBeUndefined();
});

test('plural forms follow the first numeric argument', () => {
  const l = labelsFromCatalogs(
    [
      {
        'labels.minItems': {
          one: 'Agrega {n} más',
          other: 'Agrega {n} más (varios)',
        },
      },
    ],
    'es',
  ) as Record<string, (n: number) => string>;
  expect(l.minItems(1)).toBe('Agrega 1 más');
  expect(l.minItems(3)).toBe('Agrega 3 más (varios)');
});

test('a plural with no matching form falls back to other', () => {
  const l = labelsFromCatalogs(
    [{ 'labels.minItems': { other: '{n} items' } }],
    'xx-invalid-locale-!',
  ) as Record<string, (n: number) => string>;
  expect(l.minItems(1)).toBe('1 items');
});
