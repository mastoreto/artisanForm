import type { FormikValues } from 'formik';
import type { ReactNode } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import type { SubmitState } from '../../stores/useArtisanStore';
import { definitionOf, type FieldRegistry } from './fields';
import type { FieldSchema, StepControls, StepSchema } from './types';

/** What a step can read and do; passed to `StepDefinition.render` and `custom` steps. */
export interface StepContext {
  step: StepSchema;
  index: number;
  total: number;
  values: FormikValues;
  setFieldValue: (name: string, value: unknown) => void;
  labels: ArtisanLabels;
  fieldRegistry: FieldRegistry;
  /** The step's fields that are currently visible. */
  fields: FieldSchema[];
  /** Validate, run `beforeNext` and move on (or submit on the last step). */
  next: () => Promise<void>;
  back: () => void;
  goTo: (index: number) => void;
  submit: () => Promise<void>;
  submitState: SubmitState;
  submitError: string | null;
  /** Message returned by the last blocked `beforeNext`. */
  error: string | null;
}

/** Everything the wizard needs to know about one step `kind`. */
export interface StepDefinition {
  render: (ctx: StepContext) => ReactNode;
  /** Default navigation overrides; the step's own `controls` win. */
  controls?: StepControls;
}

export type StepRegistry = Record<string, StepDefinition>;

const FormStep = ({ fields, fieldRegistry, labels }: StepContext) => (
  <>
    {fields.map((f) => {
      const def = definitionOf(fieldRegistry, f);
      return (
        <div key={f.name} className="mb-4">
          {def.groupLabel && (
            <span className="block text-sm font-medium text-gray-700">
              {f.label}
            </span>
          )}
          {def.render(f, { labels })}
          {def.groupLabel && f.helperText && (
            <p className="mt-1 text-sm text-gray-500">{f.helperText}</p>
          )}
        </div>
      );
    })}
  </>
);

export const defaultStepRegistry: StepRegistry = {
  form: { render: (ctx) => <FormStep {...ctx} /> },
  /** Free-form step: provide `render: (ctx) => ReactNode` in the schema. */
  custom: {
    render: (ctx) => {
      const render = ctx.step.render as
        | ((ctx: StepContext) => ReactNode)
        | undefined;
      return render ? render(ctx) : null;
    },
  },
};

export const stepDefinitionOf = (
  registry: StepRegistry,
  step: StepSchema,
): StepDefinition =>
  registry[step.kind ?? 'form'] ?? {
    render: () => (
      <p role="alert" className="text-sm text-red-600">
        {`Unknown step kind "${step.kind}"`}
      </p>
    ),
  };
