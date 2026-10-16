import type { Decorator } from '@storybook/react';
import type { AnySchema } from 'yup';
import StandaloneForm from '../src/components/StandaloneForm/StandaloneForm';
import type { FormValues } from '../src/engine/form/types';

/** Wraps a story in a `StandaloneForm`; `schema` fields are validated with Yup. */
export const withForm =
  (initialValues: FormValues, schema?: Record<string, AnySchema>): Decorator =>
  (Story) => (
    <StandaloneForm
      initialValues={initialValues}
      schema={schema}
      onSubmit={(values) => console.log(values)}
    >
      <Story />
      <button type="submit" className="mt-2 px-3 py-1 border rounded">
        Submit
      </button>
    </StandaloneForm>
  );
