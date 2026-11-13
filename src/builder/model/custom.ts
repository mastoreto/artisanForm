import type { ConfigShape, CustomTypeSpec } from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import { cloneJSON } from '../../schema/contract/json';
import { claimedNames, pickName } from './names';
import { fieldProperties } from './properties';
import type { Change, PropertyDescriptor } from './types';

const humanize = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

/** A starting value for a config key, so a new custom field passes its own spec. */
const sample = (shape: ConfigShape): unknown => {
  if (shape.enum?.length) return shape.enum[0];
  switch (shape.type) {
    case 'number':
    case 'integer':
      return shape.minimum ?? 0;
    case 'boolean':
      return false;
    case 'array':
      return [];
    case 'object':
      return defaultConfig(shape);
    default:
      return '';
  }
};

/** The config a new field of a custom type starts with: its required keys. */
export const defaultConfig = (
  shape: ConfigShape | undefined,
): Record<string, unknown> =>
  Object.fromEntries(
    (shape?.required ?? []).map((key) => [
      key,
      sample(shape?.properties?.[key] ?? {}),
    ]),
  );

/**
 * What the inspector edits on a custom (`x-…`) field: the properties every
 * field has, plus one control per property of the `config` declared by its
 * `spec` (a type without a spec gets the config as JSON).
 */
export const customFieldProperties = (
  spec?: CustomTypeSpec,
): PropertyDescriptor[] => {
  const base = fieldProperties('checkbox');
  const props = spec?.config?.properties;
  if (!props)
    return [
      ...base,
      {
        path: 'config',
        label: 'Settings (JSON)',
        control: 'json',
        level: 'developer',
        section: 'advanced',
      },
    ];
  const required = new Set(spec?.config?.required ?? []);
  const config = Object.entries(props).map(
    ([key, shape]): PropertyDescriptor => {
      const d: PropertyDescriptor = {
        path: `config.${key}`,
        label: humanize(key),
        control: 'json',
        level: 'simple',
        section: 'data',
        help: required.has(key) ? 'Required' : undefined,
      };
      if (
        shape.enum?.every((e) => typeof e === 'string' || typeof e === 'number')
      )
        return {
          ...d,
          control: 'enum',
          options: shape.enum as (string | number)[],
        };
      if (shape.type === 'boolean') return { ...d, control: 'boolean' };
      if (shape.type === 'number' || shape.type === 'integer')
        return {
          ...d,
          control: 'number',
          min: shape.minimum,
          max: shape.maximum,
        };
      if (shape.type === 'string') return { ...d, control: 'text' };
      return d;
    },
  );
  return [...base, ...config];
};

/** Adds a field of a custom type (the rows of an array cannot hold one). */
export const addCustomField = (
  schema: ArtisanSchemaV1,
  stepId: string,
  spec: Pick<CustomTypeSpec, 'type' | 'config' | 'description'>,
  options: { index?: number } = {},
): Change => {
  const next = cloneJSON(schema);
  const step = next.steps.find((s) => s.id === stepId);
  if (step?.type !== 'form') return { schema, error: 'not-found' };
  const base = spec.type.replace(/^x-/, '');
  const name = pickName(claimedNames(next), base);
  const config = defaultConfig(spec.config);
  const field = {
    type: spec.type,
    name,
    label: humanize(base),
    ...(Object.keys(config).length ? { config } : {}),
  } as unknown as (typeof step.fields)[number];
  const at = Math.max(
    0,
    Math.min(options.index ?? step.fields.length, step.fields.length),
  );
  step.fields.splice(at, 0, field);
  return { schema: next, selection: { kind: 'field', stepId, path: [at] } };
};
