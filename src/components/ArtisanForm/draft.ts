import { fieldsOf } from './conditions';
import {
  defaultFieldRegistry,
  definitionOf,
  type FieldRegistry,
} from './fields';
import type { FormSchema } from './types';

export interface Draft {
  values: Record<string, unknown>;
  step: number;
}

const storageKey = (key: string) => `artisanform:${key}`;

// localStorage can throw (private mode, quota) or hold junk: never break the form.
export const loadDraft = (key: string): Draft | null => {
  try {
    const raw = localStorage.getItem(storageKey(key));
    const draft = raw && JSON.parse(raw);
    return draft && typeof draft.values === 'object' ? draft : null;
  } catch {
    return null;
  }
};

export const saveDraft = (key: string, draft: Draft) => {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(draft));
  } catch {
    // ponytail: ignore storage errors; draft saving is best-effort
  }
};

export const clearDraft = (key: string) => {
  try {
    localStorage.removeItem(storageKey(key));
  } catch {
    // best-effort
  }
};

/** Passwords are never written to storage. */
export const withoutSecrets = (
  scheme: FormSchema,
  values: Record<string, unknown>,
  registry: FieldRegistry = defaultFieldRegistry,
) => {
  const secret = new Set(
    scheme.steps.flatMap((s) =>
      fieldsOf(s)
        .filter((f) => definitionOf(registry, f).secret)
        .flatMap((f) =>
          Object.keys(definitionOf(registry, f).initialValues(f)),
        ),
    ),
  );
  return Object.fromEntries(
    Object.entries(values).filter(([k]) => !secret.has(k)),
  );
};
