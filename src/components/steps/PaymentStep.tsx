import { type ReactNode, useEffect, useRef, useState } from 'react';
import type {
  PaymentPlugin,
  PaymentResult,
} from '../../integrations/payments/types';
import { useCx } from '../ui/UiContext';
import type { StepContext } from './registry';
import StatusPanel, { ActionButton } from './StatusPanel';

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** The URL without parameters this library added (so it can be returned to). */
const baseUrl = () => {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
};

/**
 * Payment step. `provider` (or `providers` to let the user choose) names
 * plugins registered through the `plugins` prop. Embedded plugins render their
 * own UI; redirect plugins send the user away and are resumed on return
 * (use `persistKey` so the wizard comes back to this step).
 */
const PaymentStep = (ctx: StepContext) => {
  const cx = useCx();
  const { step, labels, values, plugins, index, goTo } = ctx;
  const resultName = (step.resultName as string | undefined) ?? 'payment';
  const ids = (step.providers as string[] | undefined) ?? [
    step.provider as string,
  ];
  const available = ids
    .map((id) => plugins.payments[id])
    .filter((p): p is PaymentPlugin => !!p);

  const [chosen, setChosen] = useState<PaymentPlugin | null>(
    available.length === 1 ? available[0] : null,
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    provider: string;
    result: PaymentResult;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [key, setKey] = useState(newKey);
  const advanced = useRef(false);

  const request = () => ({
    values,
    idempotencyKey: key,
    returnUrl: baseUrl(),
    cancelUrl: baseUrl(),
    signal: new AbortController().signal,
  });

  const finish = (plugin: PaymentPlugin, result: PaymentResult) => {
    if (result.status === 'failed') {
      setFailure(result.message ?? labels.paymentFailed);
      setBusy(false);
      return;
    }
    const record = {
      provider: plugin.id,
      status: result.status,
      reference: result.reference,
    };
    ctx.setFieldValue(resultName, record);
    setOutcome({ provider: plugin.id, result });
  };

  // Coming back from a hosted checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const plugin of available) {
      const result = plugin.resume?.(params);
      if (!result) continue;
      const url = new URL(window.location.href);
      for (const k of plugin.resumeKeys ?? []) url.searchParams.delete(k);
      window.history.replaceState(null, '', url);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time resume from the return URL (external system: location)
      setChosen(plugin);
      finish(plugin, result);
      return;
    }
  }, []);

  // Advance once the payment record is part of the form values.
  useEffect(() => {
    if (!outcome || advanced.current) return;
    if (!values[resultName]) return;
    advanced.current = true;
    void ctx.next();
  }, [outcome, values]);

  const retry = () => {
    setKey(newKey());
    setFailure(null);
    setBusy(false);
    setAttempt((n) => n + 1);
  };

  const redirect = async (plugin: PaymentPlugin) => {
    setBusy(true);
    setFailure(null);
    try {
      const { url } = await (plugin.start as NonNullable<typeof plugin.start>)(
        request(),
      );
      plugins.navigate(url);
    } catch (e) {
      setFailure(e instanceof Error ? e.message : labels.paymentFailed);
      setBusy(false);
    }
  };

  if (available.length === 0) {
    return <StatusPanel tone="error" message={labels.noPaymentPlugin} />;
  }

  if (outcome) {
    return <StatusPanel tone="pending" message={labels.paymentProcessing} />;
  }

  return (
    <div className={cx('stack')}>
      {step.summary ? (
        <div className={cx('text')}>{step.summary as ReactNode}</div>
      ) : null}
      {!chosen && (
        <div
          role="group"
          aria-label={labels.choosePayment}
          className={cx('choiceGroup')}
        >
          {available.map((p) => (
            <ActionButton
              key={p.id}
              onClick={() => {
                setChosen(p);
                // A hosted checkout needs no further input: go straight there.
                if (p.mode === 'redirect') void redirect(p);
              }}
            >
              {labels.payWith(p.name)}
            </ActionButton>
          ))}
        </div>
      )}
      {chosen?.mode === 'embedded' && !failure && (
        <div key={attempt}>
          {chosen.render?.({
            request: request(),
            onResult: (r) => finish(chosen, r),
            labels,
          })}
        </div>
      )}
      {chosen?.mode === 'redirect' && !failure && (
        <ActionButton disabled={busy} onClick={() => void redirect(chosen)}>
          {busy ? labels.paying : labels.payWith(chosen.name)}
        </ActionButton>
      )}
      {failure && (
        <StatusPanel tone="error" message={failure}>
          <ActionButton onClick={retry}>{labels.retry}</ActionButton>
          {available.length > 1 && (
            <ActionButton
              onClick={() => {
                retry();
                setChosen(null);
              }}
            >
              {labels.changeMethod}
            </ActionButton>
          )}
          <ActionButton onClick={() => goTo(Math.max(0, index - 1))}>
            {labels.backToForm}
          </ActionButton>
        </StatusPanel>
      )}
    </div>
  );
};

export default PaymentStep;
