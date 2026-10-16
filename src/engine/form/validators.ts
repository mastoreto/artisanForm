import { createContext } from 'react';
import { type Resolver, set } from 'react-hook-form';
import type { FormValues } from './types';

/**
 * Field-level checks that depend on UI state (e.g. "an upload is running").
 * A resolver replaces RHF's per-field `validate`, so they are merged into it.
 */
export type FieldValidators = Map<string, () => string | undefined>;

export interface FormUi {
  validators: FieldValidators;
  /** True after a blocked "Next": show every error of the step, touched or not. */
  attempted: boolean;
  setAttempted: (attempted: boolean) => void;
}

export const FormUiContext = createContext<FormUi | null>(null);

/** Adds the registered field validators to the errors of `base`. */
export const withFieldValidators =
  (
    base: Resolver<FormValues>,
    validators: FieldValidators,
  ): Resolver<FormValues> =>
  async (values, context, options) => {
    const result = await base(values, context, options);
    const scope = options.names;
    const errors = { ...result.errors };
    let failed = false;
    for (const [name, validate] of validators) {
      if (scope && !scope.includes(name)) continue;
      const message = validate();
      if (!message) continue;
      set(errors, name, { type: 'validate', message });
      failed = true;
    }
    return failed ? { values: {}, errors } : result;
  };
