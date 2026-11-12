# Pagos

> 🌐 Versión en español de [payments.md](../payments.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Un paso `kind: 'payment'` cobra a través de un **plugin**. ArtisanForm incluye plugins para Stripe, Lemon Squeezy, Mercado Pago y PayPal, y podés escribir el tuyo contra el mismo contrato `PaymentPlugin`.

> **Estado:** los cuatro plugins se verifican con mocks de los SDK de los proveedores, todavía no contra sandboxes reales. Probá cada uno contra su sandbox con credenciales de prueba antes de salir a producción.

## El principio

La librería **nunca toca datos de tarjeta** (los recoge la UI alojada del proveedor o una redirección) y **nunca decide montos**. El `PaymentRequest` que entrega a un plugin no lleva monto, moneda ni ítems: **tu servidor los calcula y verifica**. Tres consecuencias:

1. Tu backend crea la orden, la sesión o el intent, con el monto que calculó.
2. Tu backend usa el `idempotencyKey` del request para que un reintento nunca cobre dos veces.
3. El resultado real se confirma con un **webhook** en tu servidor, no con lo que informa el navegador.

## Cómo funciona un paso de pago

```tsx
<ArtisanForm
  scheme={{ steps: [
    { title: 'Plan', fields: [/* … */] },
    { title: 'Pago', kind: 'payment', providers: ['stripe', 'mercadopago'], summary: 'Plan Pro' },
    { title: 'Confirmación', kind: 'pending', wait: polling(checkOrder) },
    { title: 'Listo', kind: 'result' },
  ] }}
  plugins={{ payments: [stripe({ /* … */ }), mercadoPago({ /* … */ })] }}
  persistKey="checkout"   // obligatorio en checkouts con redirección
  onSubmit={save}
/>
```

Props del paso: `provider` (el id de un plugin) o `providers` (elige el usuario), `summary` (texto o JSX que ve el usuario) y `resultName` (por defecto `payment`). El resultado `{ provider, status, reference }` se guarda en los valores del formulario y viaja en `onSubmit`.

- **Embebido** (`mode: 'embedded'`): el plugin monta la UI alojada del proveedor (`render({ request, onResult })`).
- **Redirección** (`mode: 'redirect'`): `start(request)` crea el checkout a través de tu backend y devuelve su URL; el usuario paga en el proveedor y vuelve a tu página, donde `resume(params)` lee el resultado. **La URL de retorno se puede falsificar** (cualquiera puede escribir `?stripe_status=success`), así que un éxito leído de ella se informa como `processing`, nunca `succeeded`: poné un paso `pending` después del de pago para que tu backend confirme el estado real. Con `persistKey` el wizard vuelve al paso de pago. `plugins.navigate` reemplaza a `location.assign` si necesitás controlar la navegación. Esto lo aplica el núcleo, no solo los plugins incluidos: lo que devuelva el `resume` de un plugin propio se degrada de `succeeded` a `processing`. `request.signal` se aborta cuando el paso de pago se desmonta, así un `start()` en curso puede detenerse. `parseArtisanSchema` avisa (`payment-without-confirmation`) cuando un paso de pago no va seguido de un paso `wait`.

| Resultado | Qué pasa |
| --- | --- |
| `succeeded` | El wizard avanza. Solo lo informan los plugins embebidos (el resultado viene de tu backend o del SDK del proveedor, no de la URL). |
| `processing` | El wizard avanza para que un paso `pending` espere el webhook. |
| `failed` | Se muestra el error con **Reintentar** (un `idempotencyKey` nuevo), **Elegir otro medio de pago** (cuando hay varios) y **Volver**. |

Combiná un paso de pago con un [paso `pending`](https://github.com/mastoreto/artisanForm/blob/main/docs/es/README.md#espera-de-confirmación) cuando el proveedor confirma de forma asíncrona: hace polling o escucha hasta que tu backend diga que el pago es real.


### Volver de una redirección

Con varios plugins de redirección de un mismo proveedor (por ejemplo el formulario embebido de Stripe y Stripe Checkout, o el Brick de Mercado Pago y Checkout Pro), sus parámetros de retorno pueden solaparse. El paso recuerda, para la pestaña, qué plugin envió al usuario fuera (`sessionStorage`) y le pregunta primero a ese al volver; si el storage no está disponible, se les pregunta en el orden registrado. Un plugin no necesita marcar sus propias URLs de retorno para esto.

## Checklist para salir a producción

- [ ] El monto, la moneda y los ítems se calculan en el servidor; el formulario no envía nada sensible.
- [ ] Cada endpoint que crea pagos respeta `Idempotency-Key`.
- [ ] Un webhook marca la orden como pagada; el resultado del navegador es solo una pista para la UI (el valor `payment` del payload del formulario, y todo lo que se lee de una URL de retorno, se puede falsificar: nunca lo uses como prueba de pago).
- [ ] `persistKey` está definido en todo checkout con redirección, para que el usuario vuelva al paso de pago.
- [ ] Cada plugin se probó contra el sandbox de su proveedor, incluidos los caminos de fallo y cancelación.
- [ ] Las claves de prueba y las reales están separadas (`pk_test_…` / `TEST-…` en desarrollo).

## Proveedores incluidos

Cada proveedor vive en su propio subpath, y su SDK es una `peerDependency` **opcional**: instalá solo lo que uses.

| Proveedor | Import | SDK a instalar | Modos | Lo que tu backend provee |
| --- | --- | --- | --- | --- |
| Stripe | `artisanform/payments/stripe` | `@stripe/stripe-js` y `@stripe/react-stripe-js` (solo embebido) | embebido (Payment Element), redirección (Checkout) | Un PaymentIntent (`clientSecret`) o una sesión de Checkout (`url`) |
| Lemon Squeezy | `artisanform/payments/lemonsqueezy` | ninguno (`lemon.js` se carga a demanda) | redirección, overlay | Un checkout (`url`) |
| Mercado Pago | `artisanform/payments/mercadopago` | `@mercadopago/sdk-react` (solo embebido) | embebido (Payment Brick), redirección (Checkout Pro) | Un pago (`status`, `id`) o una preferencia (`url`) |
| PayPal | `artisanform/payments/paypal` | `@paypal/react-paypal-js` | embebido | Una orden (`orderId`) y su captura (`status`) |

```tsx
import { stripe } from 'artisanform/payments/stripe';

stripe({
  publishableKey: 'pk_test_…',
  // embebido: tu backend crea el PaymentIntent y devuelve el client secret
  createPaymentIntent: (req) => api('/payment-intents', req),            // → { clientSecret }
  // o mode: 'redirect' (Stripe Checkout): tu backend crea la sesión con estas URL
  // createCheckoutSession: (req, { successUrl, cancelUrl }) => api('/checkout', { req, successUrl, cancelUrl }), // → { url }
});
```

La lista completa de opciones de cada proveedor, con un ejemplo cada uno, está en el [README](https://github.com/mastoreto/artisanForm/blob/main/docs/es/README.md#proveedores-incluidos).

### Mercado Pago en el sandbox

Si Checkout Pro termina en la página de Mercado Pago con "algo salió mal" después de pagar: usa las credenciales de un **vendedor de prueba**; paga como un **comprador de prueba** (otro usuario, del mismo país) en una ventana privada, nunca con la cuenta del vendedor ni con una real; usa la **moneda del país del vendedor** (`MP_CURRENCY`); y recuerda que `auto_return` solo se envía con https, así que con `http://localhost` plano Mercado Pago puede mostrar un botón de "volver al sitio" en vez de redirigir. Para aislar la causa con evidencia, `apps/payments-test/scripts/mp-diagnose.ts` crea la preferencia en variantes que cambian una cosa cada una (ver el README de esa app).

## Tu propio plugin

Sirve cualquier objeto que cumpla `PaymentPlugin`. Un proveedor con redirección es el caso más chico:

```ts
const myProvider: PaymentPlugin = {
  id: 'mine', name: 'Mi proveedor', mode: 'redirect',
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

## Pruebas

`mockPayment()` simula un proveedor para demos, stories y tests, en modo `embedded` (por defecto) o `redirect`. Los tests del propio repo lo usan, y Playwright cubre un pago embebido, una redirección que vuelve al paso de pago y un pago rechazado con reintento.
