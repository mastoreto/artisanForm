# ArtisanForm

> 🌐 Versión en español de [README.md](../../README.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Librería React para construir formularios multi-paso (wizard) a partir de una definición (`scheme`). Incluye inputs prediseñados con estilos en CSS plano (tematizables y reemplazables), validación con React Hook Form + Yup y el estado de los pasos en Zustand. Se desarrolla y documenta con Storybook.

> **Estado:** release candidate, `1.0.0-rc.1` (`latest` en npm; el contrato está congelado, ver [versionado](versioning.md)): wizard por `scheme` con más de 30 tipos de campo, pasos especiales (términos, pago, espera, revisión, resultado), archivos con storage conectable, plugins de pago (Stripe, Lemon Squeezy, Mercado Pago, PayPal; probados por el mantenedor contra el sandbox de cada proveedor) y kits de UI oficiales. Ver [Estado del proyecto](#estado-del-proyecto).

## Documentación

| Guía | Qué cubre |
| --- | --- |
| [Schema v1](schema-v1.md) | El contrato de esquema serializable y versionado, y `artisanform/schema` para validar valores en un servidor |
| [Versionado (contrato 1.x)](versioning.md) | Qué puede cambiar en una menor, qué exige una mayor y las guardias |
| [Extensión de UI y kits](ui.md) | Estilos, `components`, `classNames` y los kits oficiales |
| [Rendimiento](performance.md) | Presupuestos de Web Vitals y cómo correrlos |
| [API headless](headless.md) | `useArtisanWizard`: el comportamiento sin markup, para tu propia UI |
| [Pagos](payments.md) | Plugins, el principio de seguridad y una checklist de producción |
| [Archivos y storage](files.md) | Campos `file`/`image` y adaptadores de storage |
| [Accesibilidad y entornos probados](accessibility.md) | Qué viene incluido, qué se verifica, navegadores y versiones |
| [Release](releasing.md) | Cómo se publican los cinco paquetes en npm |

Cada guía tiene su original en inglés en [docs/](../). Las guías también se compilan como sitio de documentación (Starlight, `apps/docs`; se levanta con `bun run docs`).

## Stack

| Área                     | Tecnología                                  |
| ------------------------ | ------------------------------------------- |
| UI                       | React 18 o 19, TypeScript 6 (strict)        |
| Estilos                  | CSS plano con variables `--artisan-*` (Tailwind solo en playground y Storybook) |
| Estado de pasos          | Zustand 5                                   |
| Formularios y validación | React Hook Form 7 + Yup                     |
| Documentación            | Storybook 10 (`@storybook/react-vite`)      |
| Build                    | Vite 8 en modo librería (Rolldown/Oxc) + React Compiler (Rust) + `vite-plugin-dts` |
| Tests                    | `bun test` + Testing Library (happy-dom), Playwright (e2e) |
| Formato y lint           | Biome 2 (+ ESLint solo para las reglas de React Hooks / Compiler) |
| Gestor de paquetes       | Bun                                          |

## Primeros pasos

```bash
bun install
bun run storybook   # http://localhost:6006
```

| Script                      | Descripción                                          |
| --------------------------- | ---------------------------------------------------- |
| `bun run storybook`            | Storybook en desarrollo (puerto 6006)                |
| `bun run build-storybook`      | Storybook estático                                   |
| `bun run build`                | Build de la librería en `dist/` (ESM + `.d.ts`, compilada con React Compiler) |
| `bun run lint:react`           | ESLint con las reglas de React Hooks y React Compiler |
| `bun run check:dist` / `check:package` | Inspecciona la salida / valida el paquete (`publint`, `attw`) |
| `bun run typecheck`            | `tsc --noEmit`                                       |
| `bun run lint` / `bun run format` | Biome check / check --write                         |
| `bun run playground`           | App React de prueba (http://localhost:5173) que usa `src/` con HMR; escenarios en `?demo=<id>` |
| `bun run e2e`                  | Tests de Playwright (`e2e/`) contra el playground. Primera vez: `npx playwright install chromium` |
| `bun test`                  | Tests (`*.test.ts(x)`)                               |

## Uso

```tsx
import { ArtisanForm, type FormSchema } from 'artisanform';

const scheme: FormSchema = {
  steps: [
    {
      title: 'Datos personales',
      fields: [
        { type: 'text', name: 'name', label: 'Nombre', required: true, min: 3 },
        { type: 'date', name: 'birth', label: 'Nacimiento' },
      ],
    },
    {
      title: 'Ubicación',
      fields: [
        {
          type: 'dynamicSelect',
          name: 'country',
          dependentName: 'city',
          label: 'País y ciudad',
          required: true,
          options: [{ value: 'ar', label: 'Argentina' }],
          dependentOptions: { ar: [{ value: 'bsas', label: 'Buenos Aires' }] },
        },
      ],
    },
  ],
};

<ArtisanForm scheme={scheme} onSubmit={(values) => console.log(values)} />;
```

> Los textos de UI integrados (botones, mensajes de validación) están por defecto en inglés; sobrescribilos con la prop `labels`. Las etiquetas, nombres y títulos de paso salen de tu esquema y son texto libre en cualquier idioma.

### `FormSchema`

| Tipo          | Campos                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormSchema`  | `steps: StepSchema[]`                                                                                                                                                                                                           |
| `StepSchema`  | `title`, `fields: FieldSchema[]`                                                                                                                                                                                                |
| `FieldSchema` | `type`, `name`, `label`, `placeholder?`, `options?`, `required?`, `min?`, `max?`, `pattern?`, `itemFields?`, `minItems?`, `maxItems?`, `defaultValue?`, `autoComplete?`, `inputMode?`, `readOnly?`, `maxLength?`, `step?`, `minDate?`, `maxDate?`, `disabled?`, `helperText?`, `sameAs?`, `showIf?`, `dependentName?`, `dependentOptions?`, `loadDependentOptions?` |

Tipos de campo (`type`): `text`, `email`, `number`, `tel`, `url`, `textarea`, `password`, `date`, `time`, `datetime`, `month`, `daterange`, `checkbox`, `switch`, `range`, `rating`, `otp`, `file`, `image`, `select`, `dynamicSelect`, `combobox`, `multiselect`, `check`, `radio`, `array`, y de contenido (sin valor): `heading`, `paragraph`, `callout`, `divider`.

- `required` → obligatorio (en `check`, al menos una opción).
- `min` / `max` → largo del texto, o valor numérico en `number`. En campos opcionales vacíos no se validan.
- `pattern` → fuente de una expresión regular (ej. `'^[A-Z]{3}$'`). `email` valida formato de correo.
- **Contenido:** `heading`, `paragraph`, `callout` (`variant`: info/success/warning/error) usan `label` como texto y no guardan valores; `divider` es una línea. `width: 'half'` hace que dos campos compartan fila.
- **Texto:** `mask` (`#` dígito, `A` letra, `*` alfanumérico; ej. `##-########-#`), `prefix`/`suffix` (ej. `$` para importes).
- **Fechas:** `date`, `time`, `datetime`, `month` aceptan `minDate`/`maxDate`; `daterange` guarda `name` (desde) y `endName` (hasta, validando que no sea anterior).
- **`range`** (número, `min`/`max`/`step`), **`rating`** (estrellas, `length`), **`otp`** (`length`, `charset`).
- **`combobox`** (un valor) y **`multiselect`** (varios, con chips): filtran `options` al escribir o llaman a `loadOptions(texto)` para buscar en tu API.
- **`array`** (repetibles, "agregar otro"): `itemFields` define los campos de cada fila, `minItems`/`maxItems` acotan la cantidad y `addLabel` cambia el botón. El valor es una lista de objetos (`[{ name, mail }]`); cada fila se valida con las reglas de sus campos. No admite `showIf` ni arrays anidados dentro de una fila; si una fila tiene contraseñas, el campo no se guarda en borradores.
- `checkbox`/`switch` guardan un booleano; con `required` deben estar activados.
- `autoComplete`, `inputMode`, `readOnly`, `maxLength`, `step` se pasan al elemento nativo; `date` acepta `minDate`/`maxDate` (`YYYY-MM-DD`).
- `defaultValue` → valor inicial (array en `check`, booleano en `checkbox`/`switch`). `disabled` y `helperText` aplican a todos los tipos.
- `dynamicSelect` guarda dos valores: `name` (primer select) y `dependentName` (segundo), cuyas opciones salen de `dependentOptions[valorDelPrimero]` o, si es asíncrono, de `loadDependentOptions(valorDelPrimero)` (devuelve una promesa de opciones; muestra estados de carga y error).

### Esquema v1 (serializable y versionado)

Además del formato de arriba (0.2.0, que sigue funcionando), `scheme` acepta un **`ArtisanSchemaV1`**: JSON puro, con `schemaVersion`, `id`, pasos con `id` estable y `type`, condiciones declarativas (`visibleWhen`) y referencias por id a lo ejecutable (`extensions`). Se puede escribir en TypeScript con `defineForm` o recibir de una API y validar con `parseArtisanSchema` (con una `SchemaPolicy` para esquemas remotos). Los borradores (`persistKey`) se guardan como `ArtisanSnapshotV1`, con el paso por id.

```ts
import { ArtisanForm, defineForm } from 'artisanform';

const form = defineForm({
  schemaVersion: 1,
  id: 'contact',
  steps: [{ id: 'main', type: 'form', title: 'Contacto', fields: [{ name: 'email', type: 'email', required: true }] }],
});

<ArtisanForm scheme={form} onSubmit={save} />;
```

Guía completa (campos, pasos, condiciones, JSON remoto, extensibilidad, versionado, persistencia, compatibilidad y limitaciones): [schema-v1.md](schema-v1.md) (original en inglés: [docs/schema-v1.md](../schema-v1.md)).

### Condicionales y validación cruzada

- `showIf: { field, equals?, not? }` en un campo o en un paso: se muestra solo si `field` vale alguno de los `equals` (o tiene algún valor si se omite); `not: true` invierte la condición. Lo oculto no se renderiza, no se valida ni se envía en `onSubmit`, y los pasos ocultos se saltean.
- `sameAs: 'otroCampo'` exige que el valor coincida con el de otro campo (ej. confirmación de contraseña).

### Pasos

`StepSchema` acepta, además de `title` y `fields`:

| Propiedad | Descripción |
| --- | --- |
| `kind` | Tipo de paso: `form` (por defecto), `terms`, `payment`, `pending`, `review`, `result`, `custom` (más los que registres con `stepTypes`). |
| `beforeNext(values)` | Corre tras validar el paso y antes de avanzar. Devolvé `{ error }` o lanzá un error para bloquear mostrando el mensaje (ej. crear una orden en tu backend). |
| `onEnter(values)` | Corre cada vez que el paso pasa a ser el actual. |
| `controls` | `hidden`, `hidePrevious`, `hideNext`, `nextDisabled`, `nextLabel`, `previousLabel`. |
| `render(ctx)` | Solo en `kind: 'custom'`: devuelve el contenido del paso. |

`ctx` (`StepContext`) expone `values`, `setFieldValue`, `next()`, `back()`, `goTo(i)`, `submit()`, `submitState` (`idle` \| `submitting` \| `success` \| `error`), `error` y más. Si `onSubmit` lanza, el error se muestra y "Finalizar" permite reintentar.

- **`terms`**: texto de términos (`content`: texto o JSX, con scroll) y/o enlace (`href`) más un checkbox de aceptación obligatorio (valor `termsAccepted`; cambialo con `acceptName`/`acceptLabel`, o definí tus propios `fields`).
- **`review`**: resumen de todos los pasos anteriores con un botón "Editar" por paso (contraseñas enmascaradas; opciones con su etiqueta).
- **`result`**: pantalla final tras `onSubmit`. Props del paso: `message`, `errorMessage`, `actions: [{ label, href? , onClick? }]`. Se muestra al terminar el envío (éxito o error); en error ofrece "Reintentar" y "Volver al formulario". El último paso que no es `result` es el que envía.

### Pagos

`kind: 'payment'` cobra a través de un **plugin**. Stripe, Lemon Squeezy, Mercado Pago y PayPal son plugins (ver más abajo) y podés escribir el tuyo con el mismo contrato `PaymentPlugin`. Props del paso: `provider` (id del plugin) o `providers` (el usuario elige), `summary` (texto/JSX informativo) y `resultName` (por defecto `payment`: se guarda `{ provider, status, reference }` y viaja en `onSubmit`).

```tsx
<ArtisanForm
  scheme={{ steps: [
    { title: 'Plan', fields: [/* … */] },
    { title: 'Pago', kind: 'payment', providers: ['stripe', 'mercadopago'], summary: 'Plan Pro' },
    { title: 'Confirmación', kind: 'pending', wait: polling(checkOrder) },
    { title: 'Listo', kind: 'result' },
  ] }}
  plugins={{ payments: [stripe({ /* … */ }), mercadopago({ /* … */ })] }}
  persistKey="checkout"   // necesario para los checkouts con redirect
  onSubmit={save}
/>
```

- **Embebido** (`mode: 'embedded'`): el plugin monta la UI hospedada del proveedor (`render({ request, onResult })`).
- **Redirect** (`mode: 'redirect'`): `start(request)` crea el checkout (vía tu backend) y devuelve su URL; el usuario vuelve a tu página y `resume(params)` lee el resultado. Con `persistKey` el wizard vuelve al paso de pago. `plugins.navigate` reemplaza `location.assign`.
- Resultados: `succeeded` avanza; `processing` avanza para que un paso `pending` lo confirme (webhook); `failed` muestra el error con "Reintentar" (nueva `idempotencyKey`), "Elegir otro medio de pago" (si hay varios) y "Volver".

**Seguridad:** la librería **nunca toca datos de tarjeta** (UI hospedada o redirect) y el **monto/moneda/items los define y verifica tu servidor** (`PaymentRequest` no incluye importes). Usá `idempotencyKey` en tu backend para evitar cobros dobles y confirmá el pago real por webhook, no por lo que reporta el navegador. `mockPayment()` simula un proveedor para demos y tests.

**Plugin propio:**

```ts
const miProveedor: PaymentPlugin = {
  id: 'mio', name: 'Mi proveedor', mode: 'redirect',
  start: async (req) => ({ url: (await fetch('/api/checkout', { method: 'POST', headers: { 'Idempotency-Key': req.idempotencyKey }, body: JSON.stringify(req.values) }).then(r => r.json())).url }),
  resume: (params) => params.get('status') === 'ok' ? { status: 'succeeded', reference: params.get('ref') ?? undefined } : null,
  resumeKeys: ['status', 'ref'],
};
```

#### Proveedores incluidos

Cada uno vive en su subpath y sus SDK son `peerDependencies` **opcionales** (solo instalás lo que usás). Todos siguen el principio de arriba: tu backend define montos y crea las órdenes/sesiones; confirmá el pago real por webhook.

**Stripe** — `import { stripe } from 'artisanform/payments/stripe'` (embebido: `@stripe/stripe-js` and `@stripe/react-stripe-js`; Checkout hospedado: sin SDK).

```tsx
stripe({
  publishableKey: 'pk_test_…',
  // embebido (Payment Element): tu backend crea el PaymentIntent y devuelve el client secret
  createPaymentIntent: (req) => api('/payment-intents', req),            // → { clientSecret }
  // o mode: 'redirect' (Stripe Checkout): tu backend crea la sesión con estas URLs
  // createCheckoutSession: (req, { successUrl, cancelUrl }) => api('/checkout', { req, successUrl, cancelUrl }), // → { url }
})
```

**Lemon Squeezy** — `import { lemonSqueezy } from 'artisanform/payments/lemonsqueezy'` (sin SDK: el overlay carga `lemon.js` bajo demanda).

```tsx
lemonSqueezy({
  // tu backend llama a POST /v1/checkouts con tu API key y product_options.redirect_url = redirectUrl
  createCheckout: (req, { redirectUrl }) => api('/lemon/checkout', { req, redirectUrl }), // → { url }
  mode: 'redirect', // o 'overlay' (modal de lemon.js)
})
```

**Mercado Pago** — `import { mercadoPago } from 'artisanform/payments/mercadopago'` (embebido: `@mercadopago/sdk-react`; Checkout Pro: sin SDK).

```tsx
mercadoPago({
  publicKey: 'TEST-…',
  // embebido (Payment Brick): tu backend crea el pago (POST /v1/payments) con el monto que calculó él
  createPayment: (req, formData) => api('/mp/payments', { req, formData }),   // → { status, id? }
  brick: { amount: (values) => 1000 },                                         // monto que muestra el brick (el servidor es la autoridad)
  // o mode: 'redirect' (Checkout Pro): tu backend crea la preferencia con estas back_urls
  // createPreference: (req, { successUrl, failureUrl, pendingUrl }) => api('/mp/preference', …), // → { url }
  // brick.preferenceId: (req, urls) => api('/mp/preference', …).id, // enables the Mercado Pago account login in the Brick
})
```

**PayPal** — `import { paypal } from 'artisanform/payments/paypal'` (install `@paypal/react-paypal-js`).

```tsx
paypal({
  clientId: '…',
  currency: 'USD',
  createOrder: (req) => api('/paypal/orders', req),                    // → { orderId } (monto calculado por tu servidor)
  captureOrder: (req, orderId) => api('/paypal/capture', { orderId }),  // → { status: 'COMPLETED' | 'PENDING' | …, id? }
})
```

### Espera de confirmación

`kind: 'pending'` espera algo externo (un servicio, un webhook) con la estrategia `wait` que elijas, avanza solo al tener éxito y ofrece "Reintentar" / "Volver al formulario" si falla. Props: `wait`, `message`, `resultName` (guarda en el formulario el `data` del éxito), `failTo` (índice del paso al que volver). Si usás `persistKey`, tras recargar la página vuelve a esperar.

| Estrategia | Uso |
| --- | --- |
| `polling(check, { interval, timeout, backoff })` | Consulta `check({ values, signal })` cada `interval` ms. |
| `sse(url \| (values) => url, { parse, timeout })` | Server-Sent Events; cada mensaje es un estado (JSON `{ status, message?, data? }`). |
| `websocket(url \| (values) => url, { parse, timeout })` | Igual, por WebSocket. |
| `callback()` | Devuelve `{ strategy, update, resolve, fail }`; vos decidís cuándo termina. |

Un estado es `{ status: 'pending' \| 'success' \| 'failed', message?, data? }`. Para otra fuente, implementá `WaitStrategy.subscribe(onStatus, { values, signal })`.

### Archivos y storage

Los campos `file` y `image` (con vista previa) suben cada archivo apenas se elige y guardan en el formulario un **descriptor serializable** (`{ id, name, size, type, url? }`), no el `File`. Props del campo: `accept`, `maxSize` (bytes), `maxFiles` (1 reemplaza; más permite varios), `minFiles`, `capture`, `storage` (clave del adapter). Hay arrastrar y soltar, progreso, cancelar, reintentar y quitar; "Siguiente" espera a que terminen las subidas.

El destino lo definís vos con la prop `storage` (un adapter, o `{ clave: adapter }` y `storage: 'clave'` en el campo). La librería **nunca guarda credenciales**: tu backend firma.

```tsx
import { ArtisanForm, presignedPut, cloudinary } from 'artisanform';

// S3, Cloudflare R2, Backblaze B2, MinIO… (cualquier servicio S3-compatible)
const s3 = presignedPut({
  getUploadUrl: async (file) => {
    const r = await fetch('/api/upload-url', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type }) });
    return r.json(); // { url, headers?, fileUrl?, id? }
  },
});

// Cloudinary: preset sin firma, o firmado por tu backend (getSignature)
const cl = cloudinary({ cloudName: 'demo', uploadPreset: 'mi_preset_unsigned' });

<ArtisanForm scheme={scheme} storage={{ default: s3, imagenes: cl }} onSubmit={save} />;
```

**Plugin propio:** cualquier objeto `StorageAdapter` (`{ id, upload(file, { onProgress, signal }) → UploadedFile, remove? }`) sirve para otro servicio. `mockStorage()` simula subidas para demos y tests.

> La validación de tipo y tamaño en el navegador es solo UX: el servidor debe validar MIME real, tamaño y escanear los archivos.

### Tipos de campo propios

Cada tipo es una `FieldDefinition` (`render`, `initialValues`, `rules`, y opcionalmente `groupLabel`/`secret`). Los incluidos están en `defaultFieldRegistry`; agregá los tuyos con la prop `fields`:

```tsx
<ArtisanForm
  scheme={{ steps: [{ title: 'X', fields: [{ type: 'stars', name: 'rating', label: 'Rating' }] }] }}
  fields={{
    stars: {
      initialValues: (f) => ({ [f.name]: 3 }),
      rules: () => ({}),
      render: (f) => <MyStars name={f.name} label={f.label} />,
    },
  }}
  onSubmit={console.log}
/>
```

### Props de `ArtisanForm`

| Prop                  | Descripción                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `scheme`              | Definición del formulario (obligatoria): un `FormSchema` 0.2.0 o un `ArtisanSchemaV1`                                                     |
| `onSubmit(values)`    | Se llama al finalizar. Si devuelve una promesa, "Finalizar" queda deshabilitado hasta que se resuelva                                     |
| `initialValues?`      | Valores iniciales por nombre de campo; pisan los `defaultValue` del scheme                                                                |
| `onChange?(values)`   | Se llama con todos los valores en cada cambio                                                                                             |
| `onStepChange?(step)` | Se llama con el índice del nuevo paso                                                                                                     |
| `step?`               | Lleva el wizard a ese paso cuando cambia (combinar con `onStepChange`)                                                                    |
| `persistKey?`         | Guarda valores y paso en `localStorage` y los restaura al montar. Las contraseñas nunca se guardan; el borrador se borra al enviar        |
| `onSnapshotConflict?` | Qué hacer con un borrador que no corresponde a este formulario: `'backup'` (por defecto), `'restore'` o `'discard'`                       |
| `locale?` / `messages?` / `loadMessages?` | Traduce el formulario: catálogos por idioma, aplicados sobre los textos fuente del schema (ver [schema v1](schema-v1.md#traducciones-)) |
| `labels?`             | Sobrescribe cualquier texto o mensaje de validación (ver `defaultLabels`; por defecto inglés)                                            |
| `className?`          | Clases extra para el `<form>`                                                                                                             |
| `fields?`             | Registro de tipos de campo propios (ver arriba)                                                                                           |
| `stepTypes?`          | Registro de tipos de paso propios (`StepDefinition`)                                                                                      |
| `extensions?`         | Funciones y componentes locales a los que un esquema v1 hace referencia por id (`options`, `waits`, `hooks`, `renderers`, `actions`)      |
| `onUnresolved?`       | Se llama por cada nombre que el esquema usa y que `extensions` no provee; devuelve `'ignore'` para renderizar sin él (por defecto: falla con `unresolved-reference`) |
| `storage?`            | Adapter(s) de almacenamiento para campos `file`/`image` (ver arriba)                                                                      |
| `plugins?`            | `{ payments: PaymentPlugin[], navigate? }` para los pasos de pago                                                                         |

### Comportamiento del wizard

- **Siguiente** valida solo los campos del paso actual y marca sus errores; no avanza si hay alguno.
- **Finalizar** (último paso) valida todo y llama a `onSubmit` con los valores.
- `isFinalStep` se calcula a partir de la cantidad de pasos; al cambiar el `scheme` el wizard vuelve al paso 0.

## Estilos y UI

La UI por defecto es CSS plano (sin Tailwind en tu proyecto, sin reset global): `import 'artisanform/style.css'`. Reestilizala con variables CSS, sumá tus propias clases por parte con `classNames` (o quitá las nuestras con `unstyled`), o reemplazá partes completas con `components` (inputs por tipo de campo, Stepper, Controls, FieldWrapper…) para usar cualquier otra librería de UI:

```tsx
import 'artisanform/style.css';

<ArtisanForm
  scheme={scheme}
  onSubmit={save}
  classNames={{ input: 'rounded-full', button: 'bg-emerald-600' }}
  components={{ inputs: { text: MyText }, Stepper: MyStepper }}
/>;
```

```css
:root {
  --artisan-primary: #7c3aed;
  --artisan-radius: 0.75rem;
}
```

Los ajustes semánticos `ui` del esquema (`columns`, `span`, `density`, `labelPosition`) los interpreta la UI por defecto. Guía completa, contratos y notas de accesibilidad: [docs/es/ui.md](ui.md) ([inglés](../ui.md)).

## Instalación

`react-hook-form`, `yup` y `zustand` son `peerDependencies` (junto a `react` y `react-dom`, que ya tenés); usá npm, pnpm, yarn o bun. Mientras la librería esté en beta, instalala con el tag `beta`:

```bash
npm install artisanform react-hook-form yup zustand
pnpm add artisanform react-hook-form yup zustand
yarn add artisanform react-hook-form yup zustand
bun add artisanform react-hook-form yup zustand
```

Los kits de UI oficiales son paquetes aparte y opcionales, bajo el scope `@beardartisans`; tienen a `artisanform` como peer, y `artisanform` nunca depende de ellos:

```bash
npm install @beardartisans/ui-bootstrap
pnpm add @beardartisans/ui-bootstrap
yarn add @beardartisans/ui-bootstrap
bun add @beardartisans/ui-bootstrap
# o ui-mui, ui-tailwind, ui-scss
```

El uso de cada kit, y el item de registry de shadcn/ui, están en [docs/es/ui.md](ui.md#kits-de-ui).

### Compatibilidad

| Requisito | Soportado (probado) |
| --- | --- |
| React / React DOM | `^18.3.1 \|\| ^19.0.0` (18.3.1 y 19.3.1 probadas en apps Vite limpias, más SSR en Node) |
| Formato de módulo | **Solo ESM** (`"type": "module"`); `require()` de CommonJS no está soportado |
| TypeScript | `moduleResolution` `bundler`, `node16` o `nodenext`. El `node10` heredado no resuelve los tipos de `artisanform/payments/*` |
| Next.js | 15.5 y 16.4, App Router y Pages Router (probado en una app limpia con ambos, ver abajo) |
| Herramientas de build | Cualquier bundler que entienda `exports`; hay que importar `artisanform/style.css` una vez |

**React Compiler.** El código publicado ya está compilado con React Compiler (`oxc-transform-react` en Rust mediante `@vitejs/plugin-react`, `target: '18'`). Quien consume la librería **no necesita configurar el compilador**. La salida importa `react-compiler-runtime` (dependencia normal de este paquete), que funciona en React 18 y 19; React sigue siendo externo, así que hay una sola copia de React en tu app. Tu propia app puede activar u omitir el compilador por su cuenta.

**Next.js.** Las entradas que renderizan o usan hooks (`artisanform`, `artisanform/headless`, `artisanform/payments/*`) traen la directiva `'use client'`, así que funcionan en ambos routers:

- **Pages Router:** se usa como en cualquier app React (también renderiza en el servidor). Importá `artisanform/style.css` en `pages/_app.tsx`.
- **App Router:** importá `ArtisanForm` en un Client Component, o directo en un Server Component. Desde un Server Component, `onSubmit` tiene que ser una [server action](https://nextjs.org/docs/app/getting-started/mutating-data), porque una función común no puede pasar al navegador. Importá `artisanform/style.css` en `app/layout.tsx`.
- **Código de servidor:** importá desde `artisanform/schema` (`defineForm`, `parseArtisanSchema`, `validateValues`…). No tiene directiva ni React, así que corre en Server Components, route handlers y server actions. Los mismos nombres reexportados por `artisanform` son referencias de cliente ahí y no se pueden llamar en el servidor.

`bun run check:next` instala el tarball empaquetado en una app Next limpia con ambos routers y verifica el build, el HTML renderizado en el servidor, la hidratación, una server action y `validateValues` en el servidor.

**Renderizado en servidor.** El paquete compilado se renderiza con `react-dom/server` (verificado en el test de consumo). Los borradores (`persistKey`) leen `localStorage` solo en el cliente.

**Migración desde 0.2.x.** (1) Usa una cadena de herramientas que entienda ESM: se eliminó el `main`/CJS. (2) Cambiaron los nombres de archivo de `dist` (`dist/index.js`, `dist/payments/<nombre>.js`); importa siempre por el nombre del paquete y sus `exports`. (3) Con `@types/react` 19, `JSX` ya no es un espacio de nombres global; los tipos de ArtisanForm ya no lo referencian.

**Limitaciones conocidas.** Los proveedores de pago (`artisanform/payments/*`) cargan sus SDK opcionales de forma diferida, por lo que React Compiler omite algunas de sus funciones (sin cambio de comportamiento). `useWizard` queda fuera del compilador a propósito porque lee estado mutable del formulario durante el render (ver su comentario). El lint de React Hooks reporta avisos `exhaustive-deps` en efectos que dependen deliberadamente de pocos valores; están registrados como deuda.

## API pública (`src/index.ts`)

`ArtisanForm`, los inputs sueltos (`TextInput`, `Textarea`, `Password`, `DateInput`, `Select`, `DynamicSelect`, `Check`, `Radio`), `defaultFieldRegistry`, `defaultStepRegistry`, `defineForm`, `parseArtisanSchema`, `normalizeArtisanSchema`, `evaluateCondition`, `presignedPut`, `cloudinary`, `mockStorage`, `polling`, `sse`, `websocket`, `callback`, `mockPayment`, `useArtisanStore`, `cn`, `defaultLabels` y los tipos (`ArtisanSchemaV1`, `FormSchema`, `StepSchema`, `FieldSchema`, `FieldDefinition`, `StepDefinition`, `ArtisanExtensions`, `ArtisanSnapshotV1`, `StorageAdapter`, `PaymentPlugin`, `WaitStrategy`, `ArtisanLabels`…). Los plugins de pago se importan de `artisanform/payments/<proveedor>`.

Los inputs sueltos se enlazan al formulario por `name` (no `value`/`onChange`) y **deben renderizarse dentro de un `<StandaloneForm initialValues schema onSubmit>`** (lo exporta la librería; `ArtisanForm` no lo necesita). Nunca tocás React Hook Form directamente. Muestran el error de Yup cuando el campo fue tocado.

## Estructura

```
.
├── .github/                 Templates de issues y PR
├── .storybook/              Config de Storybook + withForm (decorator para stories)
├── docs/                    Guías (inglés); docs/es/ tiene las versiones en español
├── e2e/                     Tests de Playwright (contra el playground)
├── playground/              App React de prueba; escenarios en src/scenarios/
├── src/
│   ├── schema/              Contrato público v1: contract/, legacy/ (adaptador 0.2.0), parser, normalize
│   ├── persistence/         Snapshots de borradores versionados
│   ├── engine/              Ejecuta un esquema: proyección, validación, borradores, estado de pasos
│   ├── components/
│   │   ├── ArtisanForm/     ArtisanForm, Wizard, Stepper
│   │   ├── Controls/        Botones Anterior / Siguiente / Finalizar
│   │   ├── inputs/          Un componente por tipo de input (+ stories)
│   │   ├── fields/          Registro de campos (render, valores, reglas por tipo)
│   │   └── steps/           Registro de pasos + PaymentStep, StatusPanel
│   ├── integrations/
│   │   ├── payments/        PaymentPlugin, mock y proveedores (stripe, lemonsqueezy, mercadopago, paypal)
│   │   ├── storage/         StorageAdapter, presignedPut, cloudinary, mock
│   │   └── wait/            WaitStrategy: polling, sse, websocket, callback
│   ├── commons/             cn, labels
│   └── index.ts             Entry de la librería
├── AGENTS.md                Forma de trabajo (humanos y agentes)
└── vite.config.ts · tailwind.config.js · tsconfig.json · biome.jsonc · playwright.config.ts
```

## Estado del proyecto

### Hecho

- Wizard por `scheme` con validación por paso (React Hook Form + Yup), condicionales (`showIf`), borrador (`persistKey`), `labels`, theming y accesibilidad.
- Más de 30 tipos de campo (texto, fechas, selección, combobox, archivos, repetibles, contenido) y registro para tipos propios.
- Motor de pasos con `terms`, `payment`, `pending`, `review`, `result` y `custom`.
- Archivos: `StorageAdapter` + adapters para S3/R2/Backblaze (URL prefirmada) y Cloudinary.
- Pagos: contrato `PaymentPlugin` y plugins de Stripe, Lemon Squeezy, Mercado Pago y PayPal.
- Espera: `WaitStrategy` con polling, SSE, WebSocket y callback.
- **Esquema v1 (Fase 1):** contrato serializable y versionado, condiciones declarativas, parser estructural, normalización con adaptador de 0.2.0, extensiones por id y snapshots de borradores versionados ([guía](schema-v1.md)).
- Biome (formato + lint), playground en vivo, tests unitarios (`bun test`) y e2e (Playwright).
- **Kits de UI:** `@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind` y `ui-scss` en npm, más un item de registry de shadcn/ui ([guía](ui.md#kits-de-ui)).
- **Accesibilidad:** un tema por defecto que cumple el contraste WCAG AA y chequeos automáticos de axe en el CI ([guía](accessibility.md)).
- **Herramientas de release:** un workflow manual `Release` que verifica todo, y un gate `check:publish` que detecta enlaces de kits rotos, builds viejos y tipos publicados rotos. La publicación se sigue haciendo a mano con un código de un solo uso hasta que funcione Trusted Publishing ([guía](releasing.md)).

### Pendiente

- **Release:** pasar la publicación en npm de un token a Trusted Publishing, y sacar una versión estable tras el feedback de la beta ([docs/es/releasing.md](releasing.md)).
- **Proveedores reales:** Stripe, PayPal, Lemon Squeezy y el Payment Brick de Mercado Pago funcionan en sus sandboxes (pruebas manuales con `apps/payments-test`). Mercado Pago Checkout Pro (redirección) muestra un error en la propia página de Mercado Pago tras pagar; se está investigando y no hay pruebas automáticas contra el servicio real.
- **Navegador:** los tests de componentes corren en happy-dom; Playwright cubre los flujos del playground (wizard, archivos, espera, pagos mock, campos) en Chromium, Firefox y WebKit. Las pasadas con lector de pantalla, las preferencias de movimiento y los dispositivos táctiles todavía no se verifican ([docs/es/accessibility.md](accessibility.md)).
- **UI:** `layout: 'horizontal'` no tiene estilo propio y los steppers no pueden saltar entre pasos. Detalle en [docs/es/ui.md](ui.md#pendiente).
- Solo se incluye inglés. Otros idiomas salen de tus propios catálogos (`locale`, `messages`, `loadMessages`; los textos de la librería mediante `labels.*`), o solo de `labels`.

### Historial

| Rama                           | Contenido                                        |
| ------------------------------ | ------------------------------------------------ |
| AF1 `create-control-component` | Store, `cn` y `Controls`                         |
| AF2 `add-inputs`               | Inputs, stories y Prettier                       |
| AF3 `export-api`               | Exports públicos y build de la librería          |
| AF4 `formik-yup`               | Inputs integrados con Formik/Yup                 |
| AF5 `artisan-form`             | Contenedor `ArtisanForm` y `scheme`              |
| AF6 `dynamic-select`           | `DynamicSelect` con Formik y soporte en `scheme` |
| AF7 `cleanup-readme`           | Limpieza del boilerplate y documentación         |
| AF9–AF20                       | CSS distribuible, peer deps, estado por instancia, API, accesibilidad, labels, theming, condicionales, opciones async, borrador |
| AF22–AF23                      | Biome; playground y Playwright                   |
| AF24–AF28                      | Registro de campos, campos básicos, motor de pasos, resultado/revisión, términos |
| AF29–AF30                      | Campos de archivo con StorageAdapter; paso de espera |
| AF31–AF35                      | Núcleo de pagos y plugins Stripe, Lemon Squeezy, Mercado Pago, PayPal |
| AF36–AF37                      | Campos de contenido/avanzados y repetibles       |
| AF44–AF49                      | Contrato de esquema v1, parser, normalización, integración, snapshots y documentación |
| AF50                           | Inglés como idioma del proyecto; docs en español en `docs/es` |

## Flujo de trabajo

Detalle en [AGENTS.md](AGENTS.md) (original en inglés: [AGENTS.md](../../AGENTS.md)). Resumen:

- `main` estable, `develop` integración; no se commitea directo a ninguna.
- Una feature = una rama = un PR desde `develop`: `feat/AF<n>-slug`, `fix/AF<n>-slug`, `chore/slug` (`AF<n>` = número de issue).
- PR a `develop` con el [template](../../.github/PULL_REQUEST_TEMPLATE.md); `develop` → `main` solo en releases.
- Commits: `tipo: :emoji: descripción`, en inglés.
- Antes del PR: `bun run lint`, `bun run typecheck`, `bun run build` y `bun test` limpios, y story actualizada.

## Convenciones

- Biome: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 columnas, LF.
- Un componente por carpeta con su `*.stories.tsx`; `export default`.
- Inputs con `forwardRef` cuando exponen un elemento, el binding `useArtisanField` y accesibilidad básica (`label htmlFor`, `aria-invalid`, `aria-describedby`).
- Estilos solo en `src/styles/artisanform.css` mediante clases `af-*` y variables `--artisan-*`. Estado global solo en `useArtisanStore`.
- Todo lo generado en el repositorio (código, comentarios, docs, commits) va en inglés; la documentación en español vive en `docs/es/`. Los textos de la librería nunca están hardcodeados: los valores por defecto son inglés y todos se pueden sobrescribir con `labels`.
