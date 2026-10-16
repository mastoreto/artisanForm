import type { FormikValues } from 'formik';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import type { PaymentPlugin } from '../../payments/types';
import type { StorageMap } from '../../storage/types';
import type { SubmitState } from '../../stores/useArtisanStore';
import type { WaitStatus, WaitStrategy } from '../../wait';
import { visibleFields } from './conditions';
import { definitionOf, type FieldRegistry, isSecretField } from './fields';
import PaymentStep from './PaymentStep';
import StatusPanel, { actionClass } from './StatusPanel';
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
  storage: StorageMap;
  plugins: {
    payments: Record<string, PaymentPlugin>;
    navigate: (url: string) => void;
  };
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

const FormStep = ({ fields, fieldRegistry, labels, storage }: StepContext) => (
  <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
    {fields.map((f) => {
      const def = definitionOf(fieldRegistry, f);
      return (
        <div
          key={f.name}
          className={f.width === 'half' ? 'mb-4' : 'mb-4 sm:col-span-2'}
        >
          {def.groupLabel && (
            <span className="block text-sm font-medium text-gray-700">
              {f.label}
            </span>
          )}
          {def.render(f, { labels, storage, registry: fieldRegistry })}
          {def.groupLabel && f.helperText && (
            <p className="mt-1 text-sm text-gray-500">{f.helperText}</p>
          )}
        </div>
      );
    })}
  </div>
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
    typeof v === 'object' && v !== null && 'name' in v
      ? String((v as { name: unknown }).name)
      : (options?.find((o) => o.value === v)?.label ?? String(v ?? ''));
  if (f.type === 'array' && Array.isArray(raw)) {
    return (raw as Record<string, unknown>[])
      .map((row) =>
        (f.itemFields ?? [])
          .map((sub) => String(row[sub.name] ?? ''))
          .filter(Boolean)
          .join(' · '),
      )
      .join(' | ');
  }
  if (f.type === 'daterange') {
    return `${raw ?? ''} – ${values[f.endName ?? `${f.name}End`] ?? ''}`;
  }
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
      const shown = visibleFields(s, values).filter(
        (f) =>
          Object.keys(definitionOf(fieldRegistry, f).initialValues(f)).length >
          0,
      );
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
                    isSecretField(fieldRegistry, f),
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
      <StatusPanel
        tone="error"
        message={
          submitError ??
          (step.errorMessage as string | undefined) ??
          labels.submitError
        }
      >
        <button
          type="button"
          className={actionClass}
          onClick={() => void submit()}
        >
          {labels.retry}
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => goTo(Math.max(0, steps.indexOf(step) - 1))}
        >
          {labels.backToForm}
        </button>
      </StatusPanel>
    );
  }
  if (submitState === 'success') {
    return (
      <StatusPanel
        tone="success"
        message={(step.message as string | undefined) ?? labels.successMessage}
      >
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
      </StatusPanel>
    );
  }
  return <StatusPanel tone="pending" message={labels.submitting} />;
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

/**
 * Waits for something external (a service confirming, a webhook…) using the
 * step's `wait` strategy; advances on success, offers retry/back on failure.
 */
const PendingStep = (ctx: StepContext) => {
  const { step, labels, values, goTo, index } = ctx;
  const wait = step.wait as WaitStrategy | undefined;
  const [status, setStatus] = useState<WaitStatus>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<{ data: unknown } | null>(null);
  const advanced = useRef(false);
  const resultName = step.resultName as string | undefined;

  useEffect(() => {
    if (!wait) return;
    setStatus({ status: 'pending' });
    setResolved(null);
    advanced.current = false;
    const controller = new AbortController();
    let done = false;
    const stop = wait.subscribe(
      (next) => {
        if (done) return;
        setStatus(next);
        if (next.status === 'success') {
          done = true;
          if (resultName) ctx.setFieldValue(resultName, next.data);
          setResolved({ data: next.data });
        } else if (next.status === 'failed') {
          done = true;
        }
      },
      { values, signal: controller.signal },
    );
    return () => {
      done = true;
      controller.abort();
      stop();
    };
  }, [attempt]);

  // Advance only once the stored result is part of the form values, so the
  // next step (or the submit) sees it.
  useEffect(() => {
    if (!resolved || advanced.current) return;
    if (resultName && values[resultName] !== resolved.data) return;
    advanced.current = true;
    void ctx.next();
  }, [resolved, values]);

  if (status.status === 'failed') {
    const target = step.failTo as number | undefined;
    return (
      <StatusPanel tone="error" message={status.message ?? labels.waitFailed}>
        <button
          type="button"
          className={actionClass}
          onClick={() => setAttempt((n) => n + 1)}
        >
          {labels.retry}
        </button>
        <button
          type="button"
          className={actionClass}
          onClick={() => goTo(target ?? Math.max(0, index - 1))}
        >
          {labels.backToForm}
        </button>
      </StatusPanel>
    );
  }
  return (
    <StatusPanel
      tone="pending"
      message={
        status.status === 'pending' && status.message
          ? status.message
          : ((step.message as string | undefined) ?? labels.waiting)
      }
    />
  );
};

export const defaultStepRegistry: StepRegistry = {
  /** Takes a payment through a plugin (`provider`/`providers`), embedded or via redirect. */
  payment: {
    render: (ctx) => <PaymentStep {...ctx} />,
    controls: { hidden: true },
  },
  form: { render: (ctx) => <FormStep {...ctx} /> },
  /** Waits for a `wait` strategy (polling, sse, websocket, callback); auto-advances on success. */
  pending: {
    render: (ctx) => <PendingStep {...ctx} />,
    controls: { hidden: true },
  },
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
