import { useContext, useEffect, useRef } from 'react';
import { useController } from 'react-hook-form';
import { messageOf } from './errors';
import { FormUiContext } from './validators';

type ChangeInput =
  | { target: { type?: string; value?: unknown } }
  | string
  | number
  | boolean
  | null
  | undefined
  | object;

const hasTarget = (
  e: ChangeInput,
): e is { target: { type?: string; value?: unknown } } =>
  typeof e === 'object' && e !== null && 'target' in e;

/**
 * Binds an input to the running form (React Hook Form underneath). Same shape
 * like the former Formik `useField`: `[field, meta, helpers]`. Needs a
 * `FormProvider` above (`ArtisanForm` provides one).
 */
export const useArtisanField = <T = unknown>(
  name: string,
  options?: { validate?: () => string | undefined },
) => {
  const ui = useContext(FormUiContext);
  const validators = ui?.validators;
  const validateRef = useRef(options?.validate);
  validateRef.current = options?.validate;
  const hasValidate = !!options?.validate;
  useEffect(() => {
    if (!validators || !hasValidate) return;
    validators.set(name, () => validateRef.current?.());
    return () => {
      validators.delete(name);
    };
  }, [validators, name, hasValidate]);

  const { field, fieldState, formState } = useController({ name });
  const found = messageOf(fieldState.error);
  const code = fieldState.error?.type;
  // Like Formik: an error is shown once the field was touched (or Next was tried).
  const error =
    fieldState.isTouched || formState.isSubmitted || ui?.attempted
      ? found
      : undefined;

  return [
    {
      name,
      value: field.value as T,
      onBlur: field.onBlur,
      onChange: (e: ChangeInput) => {
        // Number/range inputs store numbers, not strings.
        if (hasTarget(e) && /number|range/.test(e.target.type ?? '')) {
          const parsed = Number.parseFloat(String(e.target.value));
          field.onChange(Number.isNaN(parsed) ? '' : parsed);
          return;
        }
        field.onChange(e);
      },
    },
    {
      touched: !!error,
      error,
      code: error ? String(code ?? 'invalid') : undefined,
    },
    {
      setValue: (value: T) => field.onChange(value),
      setTouched: () => field.onBlur(),
    },
  ] as const;
};
