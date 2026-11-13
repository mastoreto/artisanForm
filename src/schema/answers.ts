import type { ArtisanSchemaV1 } from './contract/define';
import type { ArtisanFieldV1 } from './contract/fields';

/**
 * Which answers a schema asks for, without validating any. Pure and
 * framework-free: a backend uses it to know the columns of an export, to index
 * or mask answers, or to project the fields of a stored schema into a table.
 */

const CONTENT_TYPES = new Set(['heading', 'paragraph', 'callout', 'divider']);

/**
 * The keys a field writes in the answers: a date range and a dynamic select
 * write two, content fields (heading, paragraph, callout, divider) write none.
 */
export const answerKeys = (field: ArtisanFieldV1): string[] => {
  if (CONTENT_TYPES.has(field.type)) return [];
  if (field.type === 'daterange')
    return [field.name, field.endName ?? `${field.name}End`];
  if (field.type === 'dynamicSelect')
    return [field.name, field.dependentName ?? `${field.name}Dependent`];
  return [field.name];
};

/**
 * The questions a schema asks, in order: the fields of its form steps, whether
 * or not a `visibleWhen` condition hides them, without content fields. The
 * fields of an `array` row are reached through its `itemFields`.
 */
export const answerFields = (schema: ArtisanSchemaV1): ArtisanFieldV1[] =>
  schema.steps.flatMap((step) =>
    step.type === 'form'
      ? step.fields.filter((field) => !CONTENT_TYPES.has(field.type))
      : [],
  );

const isSensitive = (field: ArtisanFieldV1): boolean =>
  ('sensitive' in field && field.sensitive === true) ||
  (field.type === 'array' && field.itemFields.some(isSensitive));

/**
 * Answer keys that hold sensitive data (fields flagged `sensitive: true`). An
 * `array` is sensitive as a whole when the array itself or any of its row
 * fields is flagged. The library only carries the flag; who may read these
 * answers is the backend's decision.
 */
export const sensitiveAnswerKeys = (schema: ArtisanSchemaV1): string[] =>
  answerFields(schema)
    .filter(isSensitive)
    .flatMap((field) => answerKeys(field));
