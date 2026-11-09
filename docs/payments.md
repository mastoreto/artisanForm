# Payments

> 🌐 Spanish version: [es/payments.md](es/payments.md)

A `kind: 'payment'` step charges through a **plugin**. ArtisanForm ships plugins for Stripe, Lemon Squeezy, Mercado Pago and PayPal, and you can write your own against the same `PaymentPlugin` contract.

> **Status:** the four plugins are tested against mocks of the providers' SDKs, not yet against live provider sandboxes. Run each one against its sandbox with test credentials before going to production.

## The principle

The library **never touches card data** (the provider's hosted UI or a redirect collects it) and **never decides amounts**. The `PaymentRequest` it hands to a plugin carries no amount, currency or items: **your server computes and verifies them**. Three consequences:

1. Your backend creates the order, session or intent, with the amount it calculated.
2. Your backend uses the request's `idempotencyKey` so a retry never charges twice.
3. The real outcome is confirmed by a **webhook** on your server, not by what the browser reports.

## How a payment step works

```tsx
<ArtisanForm
  scheme={{ steps: [
    { title: 'Plan', fields: [/* … */] },
    { title: 'Payment', kind: 'payment', providers: ['stripe', 'mercadopago'], summary: 'Pro plan' },
    { title: 'Confirmation', kind: 'pending', wait: polling(checkOrder) },
    { title: 'Done', kind: 'result' },
  ] }}
  plugins={{ payments: [stripe({ /* … */ }), mercadoPago({ /* … */ })] }}
  persistKey="checkout"   // required for redirect checkouts
  onSubmit={save}
/>
```

Step props: `provider` (one plugin id) or `providers` (the user chooses), `summary` (text or JSX shown to the user) and `resultName` (default `payment`). The result `{ provider, status, reference }` is stored in the form values and travels in `onSubmit`.

- **Embedded** (`mode: 'embedded'`): the plugin mounts the provider's hosted UI (`render({ request, onResult })`).
- **Redirect** (`mode: 'redirect'`): `start(request)` creates the checkout through your backend and returns its URL; the user pays on the provider and comes back to your page, where `resume(params)` reads the result. With `persistKey` the wizard returns to the payment step. `plugins.navigate` replaces `location.assign` if you need to control the navigation.

| Result | What happens |
| --- | --- |
| `succeeded` | The wizard advances. |
| `processing` | The wizard advances so a `pending` step can wait for the webhook. |
| `failed` | The error is shown with **Retry** (a new `idempotencyKey`), **Choose another payment method** (when there are several) and **Back**. |

Pair a payment step with a [`pending` step](https://github.com/mastoreto/artisanForm#waiting-for-confirmation) when the provider confirms asynchronously: it polls or listens until your backend says the payment is real.

## Going to production checklist

- [ ] The amount, currency and items are computed on the server; nothing sensitive is sent from the form.
- [ ] Every payment-creating endpoint honors `Idempotency-Key`.
- [ ] A webhook marks the order as paid; the browser result is only a hint for the UI.
- [ ] `persistKey` is set for any redirect checkout, so the user lands back on the payment step.
- [ ] Each plugin was exercised against its provider's sandbox, including failure and cancel paths.
- [ ] Test and live keys are kept apart (`pk_test_…` / `TEST-…` in development).

## Included providers

Each provider lives in its own subpath, and its SDK is an **optional** `peerDependency`: install only what you use.

| Provider | Import | SDK to install | Modes | Your backend provides |
| --- | --- | --- | --- | --- |
| Stripe | `artisanform/payments/stripe` | `@stripe/stripe-js` and `@stripe/react-stripe-js` (embedded only) | embedded (Payment Element), redirect (Checkout) | A PaymentIntent (`clientSecret`) or a Checkout session (`url`) |
| Lemon Squeezy | `artisanform/payments/lemonsqueezy` | none (`lemon.js` loads on demand) | redirect, overlay | A checkout (`url`) |
| Mercado Pago | `artisanform/payments/mercadopago` | `@mercadopago/sdk-react` (embedded only) | embedded (Payment Brick), redirect (Checkout Pro) | A payment (`status`, `id`) or a preference (`url`) |
| PayPal | `artisanform/payments/paypal` | `@paypal/react-paypal-js` | embedded | An order (`orderId`) and its capture (`status`) |

```tsx
import { stripe } from 'artisanform/payments/stripe';

stripe({
  publishableKey: 'pk_test_…',
  // embedded: your backend creates the PaymentIntent and returns the client secret
  createPaymentIntent: (req) => api('/payment-intents', req),            // → { clientSecret }
  // or mode: 'redirect' (Stripe Checkout): your backend creates the session with these URLs
  // createCheckoutSession: (req, { successUrl, cancelUrl }) => api('/checkout', { req, successUrl, cancelUrl }), // → { url }
});
```

The full option list of every provider, with an example each, is in the [README](https://github.com/mastoreto/artisanForm#included-providers).

## Your own plugin

Any object that satisfies `PaymentPlugin` works. A redirect provider is the smallest case:

```ts
const myProvider: PaymentPlugin = {
  id: 'mine', name: 'My provider', mode: 'redirect',
  start: async (req) => ({
    url: (await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Idempotency-Key': req.idempotencyKey },
      body: JSON.stringify(req.values),
    }).then((r) => r.json())).url,
  }),
  resume: (params) =>
    params.get('status') === 'ok'
      ? { status: 'succeeded', reference: params.get('ref') ?? undefined }
      : null,
  resumeKeys: ['status', 'ref'],
};
```

## Testing

`mockPayment()` simulates a provider for demos, stories and tests, in `embedded` (default) or `redirect` mode. The repo's own tests use it, and Playwright covers an embedded payment, a redirect that returns to the payment step and a declined payment with retry.
