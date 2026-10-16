import { useEffect, useState } from 'react';
import Loading from './Loading';
import type {
  EmbeddedRenderProps,
  PaymentPlugin,
  PaymentRequest,
  PaymentResult,
} from './types';

type MpStatus = 'approved' | 'pending' | 'in_process' | 'rejected' | string;

export interface MercadoPagoOptions {
  /** Public key (`APP_USR-…` / `TEST-…`): safe for the browser. */
  publicKey: string;
  /** `embedded` (Payment Brick, default) or `redirect` (Checkout Pro). */
  mode?: 'embedded' | 'redirect';
  /**
   * redirect: YOUR backend creates a Checkout Pro preference with these
   * `back_urls` (+ `auto_return`) and returns its `init_point`/`sandbox_init_point`.
   */
  createPreference?: (
    request: PaymentRequest,
    urls: { successUrl: string; failureUrl: string; pendingUrl: string },
  ) => Promise<{ url: string }>;
  /**
   * embedded: YOUR backend creates the payment (`POST /v1/payments`) from the
   * brick's `formData`, with the amount it computed itself, and returns the
   * resulting status.
   */
  createPayment?: (
    request: PaymentRequest,
    formData: unknown,
  ) => Promise<{ status: MpStatus; id?: string | number; message?: string }>;
  /** Payment Brick settings. `amount` is only what the brick displays. */
  brick?: {
    amount: number | ((values: Record<string, unknown>) => number);
    preferenceId?: string;
    locale?: string;
    customization?: Record<string, unknown>;
  };
  id?: string;
  name?: string;
}

const toResult = (
  status: MpStatus | null,
  reference?: string,
  message?: string,
): PaymentResult => {
  if (status === 'approved') return { status: 'succeeded', reference };
  if (status === 'pending' || status === 'in_process')
    return { status: 'processing', reference };
  return { status: 'failed', message };
};

const withParam = (url: string, param: string) =>
  `${url}${url.includes('?') ? '&' : '?'}${param}`;

const Brick = ({
  options,
  request,
  onResult,
  labels,
}: EmbeddedRenderProps & { options: MercadoPagoOptions }) => {
  const [ui, setUi] = useState<typeof import('@mercadopago/sdk-react') | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    import('@mercadopago/sdk-react')
      .then((mod) => {
        mod.initMercadoPago(options.publicKey, {
          locale: options.brick?.locale as never,
        });
        if (!cancelled) setUi(mod);
      })
      .catch((e) =>
        onResult({
          status: 'failed',
          message: e instanceof Error ? e.message : labels.paymentFailed,
        }),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ui) {
    return <Loading message={labels.loadingPayment} />;
  }
  const { amount, preferenceId, customization } = options.brick ?? {
    amount: 0,
  };
  const Payment = ui.Payment as unknown as React.ComponentType<
    Record<string, unknown>
  >;
  return (
    <Payment
      initialization={{
        amount: typeof amount === 'function' ? amount(request.values) : amount,
        preferenceId,
      }}
      customization={customization ?? {}}
      onSubmit={async ({ formData }: { formData: unknown }) => {
        try {
          if (!options.createPayment)
            throw new Error('mercadoPago(): createPayment is required');
          const paid = await options.createPayment(request, formData);
          onResult(
            toResult(
              paid.status,
              paid.id === undefined ? undefined : String(paid.id),
              paid.message,
            ),
          );
        } catch (e) {
          onResult({
            status: 'failed',
            message: e instanceof Error ? e.message : labels.paymentFailed,
          });
        }
      }}
      onError={(e: { message?: string }) =>
        onResult({ status: 'failed', message: e?.message })
      }
    />
  );
};

/**
 * Mercado Pago: Payment Brick embedded (needs `@mercadopago/sdk-react`) or
 * Checkout Pro redirect (no SDK needed).
 */
export const mercadoPago = ({
  mode = 'embedded',
  id = 'mercadopago',
  name = 'Mercado Pago',
  ...options
}: MercadoPagoOptions): PaymentPlugin => ({
  id,
  name,
  mode,
  resumeKeys: [
    'mp_status',
    'status',
    'collection_status',
    'payment_id',
    'preference_id',
    'collection_id',
    'external_reference',
    'merchant_order_id',
    'payment_type',
    'site_id',
    'processing_mode',
    'merchant_account_id',
  ],
  render: (props) => <Brick {...props} options={{ ...options, mode }} />,
  start: async (request) => {
    if (!options.createPreference)
      throw new Error('mercadoPago(): createPreference is required');
    return options.createPreference(request, {
      successUrl: withParam(request.returnUrl, 'mp_status=success'),
      failureUrl: withParam(request.cancelUrl, 'mp_status=failure'),
      pendingUrl: withParam(request.returnUrl, 'mp_status=pending'),
    });
  },
  resume: (params): PaymentResult | null => {
    const marker = params.get('mp_status');
    if (!marker) return null;
    // Mercado Pago appends the real payment status next to our marker.
    const status =
      params.get('status') ??
      params.get('collection_status') ??
      (marker === 'success'
        ? 'approved'
        : marker === 'pending'
          ? 'pending'
          : 'rejected');
    return toResult(
      status,
      params.get('payment_id') ?? params.get('collection_id') ?? undefined,
    );
  },
});
