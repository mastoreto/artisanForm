import { yupResolver } from '@hookform/resolvers/yup';
import type { Decorator } from '@storybook/react';
import { FormProvider, type Resolver, useForm } from 'react-hook-form';
import type { AnySchema } from 'yup';
import * as Yup from 'yup';
import type { FormValues } from '../src/engine/form/types';

const Form = ({
  initialValues,
  schema,
  children,
}: {
  initialValues: FormValues;
  schema?: Record<string, AnySchema>;
  children: React.ReactNode;
}) => {
  const methods = useForm<FormValues>({
    defaultValues: initialValues,
    resolver: schema
      ? (yupResolver(Yup.object(schema)) as unknown as Resolver<FormValues>)
      : undefined,
    mode: 'onChange',
  });
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit((values) => console.log(values))}>
        {children}
        <button type="submit" className="mt-2 px-3 py-1 border rounded">
          Submit
        </button>
      </form>
    </FormProvider>
  );
};

/** Wraps a story in a form; `schema` fields are validated with Yup. */
export const withForm =
  (initialValues: FormValues, schema?: Record<string, AnySchema>): Decorator =>
  (Story) => (
    <Form initialValues={initialValues} schema={schema}>
      <Story />
    </Form>
  );
