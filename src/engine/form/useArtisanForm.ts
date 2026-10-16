import { yupResolver } from '@hookform/resolvers/yup';
import { useMemo, useRef } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import type { AnyObjectSchema } from 'yup';
import type { FormValues } from './types';
import { type FieldValidators, withFieldValidators } from './validators';

/**
 * The single form instance of a wizard: values live here (not in Zustand),
 * validation is the Yup schema plus the registered field validators.
 */
export const useArtisanForm = (
  defaultValues: FormValues,
  validationSchema: AnyObjectSchema,
) => {
  const validators = useRef<FieldValidators>(new Map()).current;
  const resolver = useMemo(
    () =>
      withFieldValidators(
        yupResolver(validationSchema) as unknown as Resolver<FormValues>,
        validators,
      ),
    [validationSchema, validators],
  );
  const methods = useForm<FormValues>({
    defaultValues,
    resolver,
    mode: 'onChange',
    shouldUnregister: false,
  });
  return { methods, validators };
};
