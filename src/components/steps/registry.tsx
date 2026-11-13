import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import { visibleFields } from '../../engine/conditions';
import type { FormValues } from '../../engine/form/types';
import type { SubmitState } from '../../engine/store/useArtisanStore';
import type { PaymentPlugin } from '../../integrations/payments/types';
import type { StorageMap } from '../../integrations/storage/types';
import type { WaitStatus, WaitStrategy } from '../../integrations/wait';
import { isSafeUrl } from '../../schema/contract/url';
import type { CustomTypeSpec } from '../../schema/custom-types';
import type {
  FieldOption,
  FieldSchema,
  StepControls,
  StepSchema,
} from '../../schema/legacy/types';
import {
  definitionOf,
  type FieldRegistry,
  isSecretField,
  renderField,
  wrapperOwnsLabel,
} from '../fields/registry';
import { useComponents, useCx } from '../ui/UiContext';
import PaymentStep from './PaymentStep';
import StatusPanel, { ActionButton, ActionLink } from './StatusPanel';

/**
 * The stable surface for custom steps. It cannot skip the navigation rules:
 * moving on goes through `next()` (validation, `beforeNext`, submit on the last
 * step) and values can only be written under names the step owns (its fields
 * and its `resultName`).
 */
export interface ArtisanStepApi {
  step: {
    id: string;
    title: string;
    kind: string;
    index: number;
    total: number;
  };
  /** Current form values (read-only). */
  values: Readonly<FormValues>;
  /** Writes a value this step owns; any other name throws. */
  setValue(name: string, value: unknown): void;
  /** Validation messages of this step's fields, by value name. */
  errors: Readonly<Record<string, string>>;
  next(): Promise<void>;
  back(): void;
  /** Moves to a visible step by id without validating; `false` if there is none (unknown or hidden). */
  goToStep(id: string): boolean;
  submitState: SubmitState;
  submitError: string | null;
  /** Message of the last blocked transition (`beforeNext`). */
  error: string | null;
  labels: ArtisanLabels;
}

/**
 * What a step can read and do; passed to `StepDefinition.render` and `custom` steps.
 * Prefer `api` in new code: the rest is kept for compatibility (`goTo` and
 * `submit` bypass validation and are deprecated for custom steps).
 */
export interface StepContext {
  /** The stable API for custom steps. */
  api: ArtisanStepApi;
  step: StepSchema;
  index: number;
  total: number;
  values: FormValues;
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
  /** Shape of the step's `config` (see `FieldDefinition.spec`). */
  spec?: CustomTypeSpec;
  /** Default navigation overrides; the step's own `controls` win. */
  controls?: StepControls;
}

export type StepRegistry = Record<string, StepDefinition>;

/** Fails early, with the kind name, when a custom step has no `render`. */
export const assertStepRegistry = (registry: StepRegistry): StepRegistry => {
  for (const [kind, def] of Object.entries(registry)) {
    if (typeof def?.render !== 'function')
      throw new Error(
        `Step kind "${kind}" is incomplete: it needs a \`render\` function`,
      );
  }
  return registry;
};

const FormStep = ({ fields, fieldRegistry, labels, storage }: StepContext) => {
  const cx = useCx();
  const components = useComponents();
  return (
    <div className={cx('fieldGrid')}>
      {fields.map((f) => {
        const def = definitionOf(fieldRegistry, f);
        return (
          <div
            key={f.name}
            className={cx('fieldCell')}
            data-span={f.width === 'half' ? 1 : 2}
          >
            {def.groupLabel &&
              !wrapperOwnsLabel(components, f) &&
              (def.labelFor ? (
                <label htmlFor={f.name} className={cx('groupLabel')}>
                  {f.label}
                </label>
              ) : (
                <span className={cx('groupLabel')}>{f.label}</span>
              ))}
            {renderField(def, f, {
              labels,
              storage,
              registry: fieldRegistry,
              cx,
              components,
            })}
            {def.groupLabel &&
              f.helperText &&
              !wrapperOwnsLabel(components, f) && (
                <p className={cx('description')}>{f.helperText}</p>
              )}
          </div>
        );
      })}
    </div>
  );
};

const displayValue = (
  f: FieldSchema,
  values: FormValues,
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
}: StepContext) => {
  const cx = useCx();
  return (
    <div className={cx('review')}>
      {steps.slice(0, index).map((s, i) => {
        const shown = visibleFields(s, values).filter(
          (f) =>
            Object.keys(definitionOf(fieldRegistry, f).initialValues(f))
              .length > 0,
        );
        if (shown.length === 0) return null;
        return (
          <section key={s.title} aria-label={s.title}>
            <div className={cx('arrayItemHeader')}>
              <h3 className={cx('statusTitle')}>{s.title}</h3>
              <button
                type="button"
                className={cx('link')}
                onClick={() => goTo(i)}
              >
                {labels.edit}
                <span className={cx('srOnly')}>{` ${s.title}`}</span>
              </button>
            </div>
            <dl className={cx('reviewList')}>
              {shown.map((f) => (
                <div key={f.name} className={cx('reviewRow')}>
                  <dt className={cx('muted')}>{f.label}</dt>
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
};

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
        <ActionButton onClick={() => void submit()}>
          {labels.retry}
        </ActionButton>
        <ActionButton
          onClick={() => goTo(Math.max(0, steps.indexOf(step) - 1))}
        >
          {labels.backToForm}
        </ActionButton>
      </StatusPanel>
    );
  }
  if (submitState === 'success') {
    return (
      <StatusPanel
        tone="success"
        message={(step.message as string | undefined) ?? labels.successMessage}
      >
        {actions
          .filter((a) => !a.href || isSafeUrl(a.href))
          .map((a) =>
            a.href ? (
              <ActionLink key={a.label} href={a.href}>
                {a.label}
              </ActionLink>
            ) : (
              <ActionButton key={a.label} onClick={a.onClick}>
                {a.label}
              </ActionButton>
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
  const cx = useCx();
  const content = step.content as ReactNode;
  const href = step.href as string | undefined;
  return (
    <>
      {content && (
        <section tabIndex={0} aria-label={step.title} className={cx('terms')}>
          {content}
        </section>
      )}
      {href && isSafeUrl(href) && (
        <p className={cx('text')}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cx('link')}
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
  const timeoutMs = step.timeoutMs as number | undefined;
  const retry = step.retry as { max: number; backoffMs?: number } | undefined;
  const [status, setStatus] = useState<WaitStatus>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const [resolved, setResolved] = useState<{ data: unknown } | null>(null);
  const advanced = useRef(false);
  // Automatic retries used since the user last asked (or since the step began).
  const retries = useRef(0);
  const resultName = step.resultName as string | undefined;

  useEffect(() => {
    if (!wait) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the wait is retried; subscription starts below
    setStatus({ status: 'pending' });
    setResolved(null);
    advanced.current = false;
    const controller = new AbortController();
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      done = true;
      clearTimeout(deadline);
    };
    // A failure is retried by itself (growing delay) before the user sees it.
    const fail = (message?: string) => {
      finish();
      controller.abort();
      if (retry && retries.current < retry.max) {
        retries.current += 1;
        timer = setTimeout(
          () => setAttempt((n) => n + 1),
          (retry.backoffMs ?? 1000) * retries.current,
        );
        return;
      }
      setStatus({ status: 'failed', message });
    };
    const stop = wait.subscribe(
      (next) => {
        if (done) return;
        if (next.status === 'failed') return fail(next.message);
        setStatus(next);
        if (next.status === 'success') {
          finish();
          if (resultName) ctx.setFieldValue(resultName, next.data);
          setResolved({ data: next.data });
        }
      },
      { values, signal: controller.signal },
    );
    if (timeoutMs)
      deadline = setTimeout(() => {
        if (!done) fail(labels.waitTimeout);
      }, timeoutMs);
    return () => {
      done = true;
      clearTimeout(timer);
      clearTimeout(deadline);
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

  // `failTo` is a step id; it only counts if that step is currently visible.
  const failId = typeof step.failTo === 'string' ? step.failTo : undefined;
  const found = failId ? ctx.steps.findIndex((s) => s.id === failId) : -1;
  const leave = () => goTo(found >= 0 ? found : Math.max(0, index - 1));

  if (status.status === 'failed') {
    return (
      <StatusPanel tone="error" message={status.message ?? labels.waitFailed}>
        <ActionButton
          onClick={() => {
            retries.current = 0;
            setAttempt((n) => n + 1);
          }}
        >
          {labels.retry}
        </ActionButton>
        <ActionButton onClick={leave}>{labels.backToForm}</ActionButton>
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
    >
      {step.cancellable ? (
        <ActionButton onClick={leave}>{labels.cancel}</ActionButton>
      ) : null}
    </StatusPanel>
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

const UnknownStep = ({
  kind,
  labels,
}: {
  kind: string;
  labels: ArtisanLabels;
}) => {
  const cx = useCx();
  return (
    <p role="alert" className={cx('error')}>
      {labels.unknownStepKind(kind)}
    </p>
  );
};

export const stepDefinitionOf = (
  registry: StepRegistry,
  step: StepSchema,
): StepDefinition =>
  registry[step.kind ?? 'form'] ?? {
    render: ({ labels }) => (
      <UnknownStep kind={String(step.kind)} labels={labels} />
    ),
  };
