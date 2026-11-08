import { get } from 'react-hook-form';

/**
 * The message at `path` of an RHF errors tree. Handles nested paths
 * (`rows.0.city`) and array-level errors, which the Yup resolver reports
 * either on the array itself or under `.root`.
 */
export const messageOf = (error: unknown): string | undefined => {
  const found = error as
    | { message?: unknown; root?: { message?: unknown } }
    | undefined;
  const message = found?.message ?? found?.root?.message;
  return typeof message === 'string' && message ? message : undefined;
};

export const errorAt = (errors: unknown, path: string): string | undefined =>
  messageOf(get(errors, path));
