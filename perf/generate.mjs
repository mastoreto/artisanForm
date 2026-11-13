// Deterministic synthetic schemas for the performance harness: the same
// `fields` count always gives the same ArtisanSchemaV1, so numbers are
// comparable between runs and machines.
const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

// One factory per type; `n` keeps names and labels unique.
const makers = [
  (n) => ({
    type: 'text',
    name: `f${n}`,
    label: `Text ${n}`,
    required: n % 3 === 0,
    validation: { minLength: 2, maxLength: 80 },
  }),
  (n) => ({
    type: 'email',
    name: `f${n}`,
    label: `Email ${n}`,
    required: true,
  }),
  (n) => ({ type: 'tel', name: `f${n}`, label: `Phone ${n}` }),
  (n) => ({
    type: 'number',
    name: `f${n}`,
    label: `Number ${n}`,
    validation: { min: 0, max: 1000 },
  }),
  (n) => ({ type: 'select', name: `f${n}`, label: `Select ${n}`, options }),
  (n) => ({
    type: 'radio',
    name: `f${n}`,
    label: `Radio ${n}`,
    required: true,
    options,
  }),
  (n) => ({ type: 'checkbox', name: `f${n}`, label: `Check ${n}` }),
  (n) => ({
    type: 'textarea',
    name: `f${n}`,
    label: `Notes ${n}`,
    validation: { maxLength: 500 },
  }),
  (n) => ({ type: 'date', name: `f${n}`, label: `Date ${n}` }),
  (n) => ({
    type: 'text',
    name: `f${n}`,
    label: `Code ${n}`,
    validation: { pattern: '^[A-Z]{2}[0-9]{4}$' },
  }),
];

/** A schema with `fields` fields in steps of `perStep` (default 8), ~15% of them conditional. */
export const generateSchema = (fields, seed = 1, perStep = 8) => {
  const rand = mulberry32(seed + fields);
  const steps = [];
  const controllers = []; // names of select/radio/checkbox fields seen so far
  let n = 0;
  while (n < fields) {
    const step = [];
    for (let i = 0; i < perStep && n < fields; i++, n++) {
      const field = makers[n % makers.length](n);
      if (controllers.length && rand() < 0.15) {
        const c = controllers[Math.floor(rand() * controllers.length)];
        field.visibleWhen =
          c.type === 'checkbox'
            ? { field: c.name, operator: 'eq', value: true }
            : { field: c.name, operator: 'eq', value: 'a' };
      }
      if (['select', 'radio', 'checkbox'].includes(field.type))
        controllers.push({ name: field.name, type: field.type });
      step.push(field);
    }
    steps.push({
      id: `s${steps.length}`,
      type: 'form',
      title: `Step ${steps.length + 1}`,
      fields: step,
    });
  }
  steps.push({ id: 'done', type: 'result', title: 'Done', message: 'Saved' });
  return { schemaVersion: 1, id: `synthetic-${fields}`, revision: 1, steps };
};

export const SIZES = [10, 50, 200];
