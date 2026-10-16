import type { Decorator } from '@storybook/react';
import { Form, Formik, type FormikValues } from 'formik';
import type { AnySchema } from 'yup';
import * as Yup from 'yup';

/** Wraps a story in a Formik form; `schema` fields are validated with Yup. */
export const withFormik =
  (
    initialValues: FormikValues,
    schema?: Record<string, AnySchema>,
  ): Decorator =>
  (Story) => (
    <Formik
      initialValues={initialValues}
      validationSchema={schema && Yup.object(schema)}
      onSubmit={(values) => console.log(values)}
    >
      <Form>
        <Story />
        <button type="submit" className="mt-2 px-3 py-1 border rounded">
          Submit
        </button>
      </Form>
    </Formik>
  );
