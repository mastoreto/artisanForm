import { useEffect, useState } from 'react';
import { ActionButton } from '../../../components/steps/StatusPanel';
import { iconOr, LemonSqueezyIcon } from '../brands';
import Loading from '../Loading';
import type {
  EmbeddedRenderProps,
  PaymentDisplayOptions,
  PaymentPlugin,
  PaymentRequest,
  PaymentResult,
} from '../types';

export interface LemonSqueezyOptions extends PaymentDisplayOptions {
  /**
   * YOUR backend calls the Lemon Squeezy API (`POST /v1/checkouts`) with your
   * API key, product/variant and `product_options.redirect_url = redirectUrl`,
   * and returns the checkout `url`. The API key never reaches the browser.
   */
  createCheckout: (
    request: PaymentRequest,
    urls: { redirectUrl: string },
  ) => Promise<{ url: string }>;
  /** `redirect` (default): hosted checkout page. `overlay`: lemon.js modal. */
  mode?: 'redirect' | 'overlay';
  id?: string;
  name?: string;
}

interface LemonEvent {
  event: string;
  data?: { order?: { data?: { id?: string } } };
}

interface LemonWindow {
  createLemonSqueezy?: () => void;
  LemonSqueezy?: {
    Setup: (config: { eventHandler: (e: LemonEvent) => void }) => void;
    Url: { Open: (url: string) => void };
  };
}

const LEMON_JS = 'https://assets.lemonsqueezy.com/lemon.js';

const lemon = () => window as unknown as LemonWindow;

const loadLemon = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const ready = () => {
      lemon().createLemonSqueezy?.();
      return !!lemon().LemonSqueezy;
    };
    if (ready()) return resolve();
    const script = document.createElement('script');
    script.src = LEMON_JS;
    script.defer = true;
    script.onload = () => (ready() ? resolve() : reject(new Error('lemon.js')));
    script.onerror = () => reject(new Error('lemon.js'));
    document.head.appendChild(script);
  });

const withParam = (url: string, param: string) =>
  `${url}${url.includes('?') ? '&' : '?'}${param}`;

const redirectUrl = (request: PaymentRequest) =>
  withParam(request.returnUrl, 'lemon_status=success');

const Overlay = ({
  options,
  request,
  onResult,
  labels,
}: EmbeddedRenderProps & { options: LemonSqueezyOptions }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [checkout] = await Promise.all([
          options.createCheckout(request, {
            redirectUrl: redirectUrl(request),
          }),
          loadLemon(),
        ]);
        lemon().LemonSqueezy?.Setup({
          eventHandler: (e) => {
            if (e.event === 'Checkout.Success') {
              onResult({
                status: 'succeeded',
                reference: e.data?.order?.data?.id,
              });
            }
          },
        });
        if (!cancelled) setUrl(checkout.url);
      } catch (e) {
        if (!cancelled)
          onResult({
            status: 'failed',
            message: e instanceof Error ? e.message : labels.paymentFailed,
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!url) {
    return <Loading message={labels.loadingPayment} />;
  }
  return (
    <ActionButton onClick={() => lemon().LemonSqueezy?.Url.Open(url)}>
      {labels.pay}
    </ActionButton>
  );
};

/** Lemon Squeezy: hosted checkout (redirect) or the lemon.js overlay. */
export const lemonSqueezy = ({
  mode = 'redirect',
  id = 'lemonsqueezy',
  name = 'Lemon Squeezy',
  icon,
  description,
  ...options
}: LemonSqueezyOptions): PaymentPlugin => ({
  id,
  name,
  icon: iconOr(icon, <LemonSqueezyIcon />),
  description,
  mode: mode === 'overlay' ? 'embedded' : 'redirect',
  resumeKeys: ['lemon_status'],
  render: (props) => <Overlay {...props} options={{ ...options, mode }} />,
  start: (request) =>
    options.createCheckout(request, { redirectUrl: redirectUrl(request) }),
  // The return URL is forgeable: a success there is only "processing" until
  // your backend confirms it (see ../resume.ts).
  resume: (params): PaymentResult | null =>
    params.get('lemon_status') === 'success' ? { status: 'processing' } : null,
});
