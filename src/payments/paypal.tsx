import { useEffect, useState } from 'react';
import type {
  EmbeddedRenderProps,
  PaymentPlugin,
  PaymentRequest,
} from './types';

export interface PayPalOptions {
  /** Client ID (public). */
  clientId: string;
  /** Currency of the JS SDK (the amount itself comes from your backend). */
  currency?: string;
  /**
   * YOUR backend creates the order (Orders v2, `POST /v2/checkout/orders`)
   * with the amount it computed, and returns its id.
   */
  createOrder: (request: PaymentRequest) => Promise<{ orderId: string }>;
  /**
   * YOUR backend captures the approved order (`POST …/capture`) and returns
   * its status (`COMPLETED`, `PENDING`…).
   */
  captureOrder: (
    request: PaymentRequest,
    orderId: string,
  ) => Promise<{ status: string; id?: string; message?: string }>;
  /** PayPal Buttons style options. */
  style?: Record<string, unknown>;
  id?: string;
  name?: string;
}

const Buttons = ({
  options,
  request,
  onResult,
  labels,
}: EmbeddedRenderProps & { options: PayPalOptions }) => {
  const [ui, setUi] = useState<typeof import('@paypal/react-paypal-js') | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    import('@paypal/react-paypal-js')
      .then((mod) => {
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
    return (
      <p role="status" className="text-gray-600">
        {labels.loadingPayment}
      </p>
    );
  }

  const fail = (e: unknown) =>
    onResult({
      status: 'failed',
      message: e instanceof Error ? e.message : labels.paymentFailed,
    });

  return (
    <ui.PayPalScriptProvider
      options={{
        clientId: options.clientId,
        currency: options.currency ?? 'USD',
        intent: 'capture',
      }}
    >
      <ui.PayPalButtons
        style={options.style as never}
        createOrder={async () => (await options.createOrder(request)).orderId}
        onApprove={async (data) => {
          try {
            const captured = await options.captureOrder(request, data.orderID);
            const reference = captured.id ?? data.orderID;
            onResult(
              captured.status === 'COMPLETED'
                ? { status: 'succeeded', reference }
                : captured.status === 'PENDING'
                  ? { status: 'processing', reference }
                  : { status: 'failed', message: captured.message },
            );
          } catch (e) {
            fail(e);
          }
        }}
        onError={fail}
      />
    </ui.PayPalScriptProvider>
  );
};

/** PayPal Smart Buttons (needs `@paypal/react-paypal-js`). */
export const paypal = ({
  id = 'paypal',
  name = 'PayPal',
  ...options
}: PayPalOptions): PaymentPlugin => ({
  id,
  name,
  mode: 'embedded',
  render: (props) => <Buttons {...props} options={options} />,
});
