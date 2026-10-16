import { yupResolver } from '@hookform/resolvers/yup';
import { type ReactNode, useMemo } from 'react';
import { FormProvider, type Resolver, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import type { FormValues } from '../../engine/form/types';
import { type ArtisanClassNames, UiContext, useCx } from '../ui/UiContext';

interface StandaloneFormProps {
  /** Starting values, keyed by the `name` of each input. */
  initialValues?: FormValues;
  /** Yup rules per input `name`; errors show once an input is touched. */
  schema?: Record<string, Yup.AnySchema>;
  /** Called with the values when the form is submitted and valid. */
  onSubmit?: (values: FormValues) => void;
  /** Extra classes for the <form> element. */
  className?: string;
  /** Extra classes per part of the default UI. */
  classNames?: ArtisanClassNames;
  /** Do not emit the `af-*` classes. */
  unstyled?: boolean;
  children: ReactNode;
}

/**
 * A form around standalone inputs (`TextInput`, `Select`…): they bind by
 * `name`, so they need one. `ArtisanForm` does not need it.
 */
const StandaloneForm = ({
  classNames,
  unstyled,
  ...props
}: StandaloneFormProps) => {
  const ui = useMemo(() => ({ classNames, unstyled }), [classNames, unstyled]);
  return (
    <UiContext.Provider value={ui}>
      <Form {...props} />
    </UiContext.Provider>
  );
};

const Form = ({
  initialValues = {},
  schema,
  onSubmit,
  className,
  children,
}: Omit<StandaloneFormProps, 'classNames' | 'unstyled'>) => {
  const cx = useCx();
  const methods = useForm<FormValues>({
    defaultValues: initialValues,
    resolver: schema
      ? (yupResolver(Yup.object(schema)) as unknown as Resolver<FormValues>)
      : undefined,
    mode: 'onChange',
  });
  return (
    <FormProvider {...methods}>
      <form
        noValidate
        className={cx('root', className)}
        onSubmit={methods.handleSubmit((values) => onSubmit?.(values))}
      >
        {children}
      </form>
    </FormProvider>
  );
};

export default StandaloneForm;
