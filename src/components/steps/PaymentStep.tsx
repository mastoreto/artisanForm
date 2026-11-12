import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { fromReturnUrl } from '../../integrations/payments/resume';
import type {
  PaymentPlugin,
  PaymentResult,
} from '../../integrations/payments/types';
import { useCx } from '../ui/UiContext';
import type { StepContext } from './registry';
import StatusPanel, { ActionButton } from './StatusPanel';

// `randomUUID` needs a secure context; `getRandomValues` does not. No weaker fallback.
const newKey = () => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues)
    return Array.from(c.getRandomValues(new Uint8Array(16)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  throw new Error('Payments need a secure random source (crypto)');
};

/** The URL without parameters this library added (so it can be returned to). */
const baseUrl = () => {
  const url = new URL(window.location.href);
  url.hash = '';
  return url.toString();
};

// Two plugins of one provider can share their return parameters (Stripe's
// embedded form and Checkout, Mercado Pago's Brick and Checkout Pro). Which
// one sent the user away is remembered for the trip so, on return, it is the
// one asked first. sessionStorage is per tab and survives the redirect; when
// it is unavailable the plugins are asked in their registered order.
const sentWith = (resultName: string) => {
  const key = `artisanform:payment-plugin:${resultName}`;
  return {
    remember: (id: string) => {
      try {
        sessionStorage.setItem(key, id);
      } catch {
        // storage blocked: fall back to the registered order
      }
    },
    recall: () => {
      try {
        return sessionStorage.getItem(key);
      } catch {
        return null;
      }
    },
    forget: () => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // nothing to clean
      }
    },
  };
};

/**
 * One payment method in the selector: its logo, its name and a line saying
 * whether the user stays here or is redirected. The logo is decorative (the
 * name is the label), so a plugin without one still reads and works the same.
 */
const PaymentOption = ({
  plugin,
  name,
  hint,
  onChoose,
}: {
  plugin: PaymentPlugin;
  name: string;
  hint: string;
  onChoose: () => void;
}) => {
  const cx = useCx();
  const id = useId();
  return (
    <button
      type="button"
      className={cx('paymentOption')}
      data-mode={plugin.mode}
      aria-labelledby={`${id}-name`}
      aria-describedby={`${id}-hint`}
      onClick={onChoose}
    >
      {plugin.icon ? (
        <span className={cx('paymentOptionIcon')} aria-hidden="true">
          {plugin.icon}
        </span>
      ) : null}
      <span className={cx('paymentOptionText')}>
        <span id={`${id}-name`} className={cx('paymentOptionName')}>
          {name}
        </span>
        <span id={`${id}-hint`} className={cx('paymentOptionHint')}>
          {hint}
        </span>
      </span>
    </button>
  );
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

  // Aborted when the step unmounts (the user left, or the wizard moved on), so
  // an in-flight `start()` can stop. A fresh controller after StrictMode's
  // simulated unmount.
  const [controller, setController] = useState(() => new AbortController());
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- replaces a controller aborted by the simulated unmount
    if (controller.signal.aborted) setController(new AbortController());
    return () => controller.abort();
  }, [controller]);

  const request = () => ({
    values,
    idempotencyKey: key,
    returnUrl: baseUrl(),
    cancelUrl: baseUrl(),
    signal: controller.signal,
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
    const used = sentWith(resultName).recall();
    // The plugin the user left with first; the rest keep their order.
    const ordered = [
      ...available.filter((p) => p.id === used),
      ...available.filter((p) => p.id !== used),
    ];
    for (const plugin of ordered) {
      const reported = plugin.resume?.(params);
      if (!reported) continue;
      sentWith(resultName).forget();
      // The return URL is forgeable: whatever a plugin reports from it, the
      // core never records it as `succeeded` (a `pending` step confirms it).
      const result = fromReturnUrl(reported);
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
      sentWith(resultName).remember(plugin.id);
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
          className={cx('paymentOptions')}
        >
          {available.map((p) => (
            <PaymentOption
              key={p.id}
              plugin={p}
              hint={
                p.description ??
                (p.mode === 'redirect'
                  ? labels.payHintRedirect
                  : labels.payHintEmbedded)
              }
              name={labels.payWith(p.name)}
              onChoose={() => {
                setChosen(p);
                // A hosted checkout needs no further input: go straight there.
                if (p.mode === 'redirect') void redirect(p);
              }}
            />
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
