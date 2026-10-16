import type { FormikValues } from 'formik';
import type { ReactNode } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import type { SubmitState } from '../../stores/useArtisanStore';
import { visibleFields } from './conditions';
import { definitionOf, type FieldRegistry } from './fields';
import type {
  FieldOption,
  FieldSchema,
  StepControls,
  StepSchema,
} from './types';

/** What a step can read and do; passed to `StepDefinition.render` and `custom` steps. */
export interface StepContext {
  step: StepSchema;
  index: number;
  total: number;
  values: FormikValues;
  setFieldValue: (name: string, value: unknown) => void;
  labels: ArtisanLabels;
  fieldRegistry: FieldRegistry;
  /** All currently visible steps (in order). */
  steps: StepSchema[];
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

const displayValue = (
  f: FieldSchema,
  values: FormikValues,
  labels: ArtisanLabels,
  secret: boolean,
): string => {
  const raw = values[f.name];
  if (secret) return raw ? '••••••' : '';
  const labelOf = (options: FieldOption[] | undefined, v: unknown) =>
    options?.find((o) => o.value === v)?.label ?? String(v ?? '');
  if (typeof raw === 'boolean') return raw ? labels.yes : labels.no;
  if (Array.isArray(raw))
    return raw.map((v) => labelOf(f.options, v)).join(', ');
  if (f.type === 'dynamicSelect') {
    const parent = labelOf(f.options, raw);
    const child = f.dependentName
      ? labelOf(f.dependentOptions?.[String(raw)], values[f.dependentName])
      : '';
    return [parent, child].filter(Boolean).join(' / ');
  }
  return labelOf(f.options, raw);
};

/** Summary of every earlier step with an "edit" shortcut to each. */
const ReviewStep = ({
  steps,
  index,
  values,
  labels,
  goTo,
  fieldRegistry,
}: StepContext) => (
  <div className="space-y-6">
    {steps.slice(0, index).map((s, i) => {
      const shown = visibleFields(s, values);
      if (shown.length === 0) return null;
      return (
        <section key={s.title} aria-label={s.title}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{s.title}</h3>
            <button
              type="button"
              className="text-sm underline"
              onClick={() => goTo(i)}
            >
              {labels.edit}
              <span className="sr-only">{` ${s.title}`}</span>
            </button>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {shown.map((f) => (
              <div key={f.name} className="contents">
                <dt className="text-gray-500">{f.label}</dt>
                <dd>
                  {displayValue(
                    f,
                    values,
                    labels,
                    !!definitionOf(fieldRegistry, f).secret,
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      );
    })}
  </div>
);

interface ResultAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

const actionClass =
  'inline-block rounded border px-4 py-2 text-sm hover:bg-gray-100';

/** Final screen: shows the outcome of `onSubmit` (success, error with retry). */
const ResultStep = ({
  step,
  labels,
  submitState,
  submitError,
  submit,
  goTo,
  steps,
}: StepContext) => {
  const actions = (step.actions as ResultAction[] | undefined) ?? [];
  if (submitState === 'error') {
    return (
      <div role="alert" className="space-y-3">
        <p className="text-red-600">
          {submitError ??
            (step.errorMessage as string | undefined) ??
            labels.submitError}
        </p>
        <button
          type="button"
          className={actionClass}
          onClick={() => void submit()}
        >
          {labels.retry}
        </button>{' '}
        <button
          type="button"
          className={actionClass}
          onClick={() => goTo(Math.max(0, steps.indexOf(step) - 1))}
        >
          {labels.backToForm}
        </button>
      </div>
    );
  }
  if (submitState === 'success') {
    return (
      <div role="status" className="space-y-3">
        <p>{(step.message as string | undefined) ?? labels.successMessage}</p>
        {actions.map((a) =>
          a.href ? (
            <a key={a.label} href={a.href} className={actionClass}>
              {a.label}
            </a>
          ) : (
            <button
              key={a.label}
              type="button"
              className={actionClass}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ),
        )}
      </div>
    );
  }
  return (
    <p role="status" className="text-gray-500">
      {labels.submitting}
    </p>
  );
};

/** Terms text (and/or a link) plus the acceptance checkbox (a required field). */
const TermsStep = (ctx: StepContext) => {
  const { step, labels } = ctx;
  const content = step.content as ReactNode;
  const href = step.href as string | undefined;
  return (
    <>
      {content && (
        <section
          tabIndex={0}
          aria-label={step.title}
          className="mb-4 max-h-64 overflow-auto whitespace-pre-line rounded border p-3 text-sm"
        >
          {content}
        </section>
      )}
      {href && (
        <p className="mb-4 text-sm">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {labels.readFullTerms}
          </a>
        </p>
      )}
      <FormStep {...ctx} />
    </>
  );
};

export const defaultStepRegistry: StepRegistry = {
  form: { render: (ctx) => <FormStep {...ctx} /> },
  /** Terms text (`content`) and/or link (`href`) plus a required acceptance checkbox. */
  terms: { render: (ctx) => <TermsStep {...ctx} /> },
  /** Summary of the previous steps with "edit" shortcuts. */
  review: { render: (ctx) => <ReviewStep {...ctx} /> },
  /** Outcome screen after `onSubmit`; place it last. */
  result: {
    render: (ctx) => <ResultStep {...ctx} />,
    controls: { hidden: true },
  },
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
