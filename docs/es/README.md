# ArtisanForm

> 🌐 Versión en español de [README.md](../../README.md) (el original, en inglés, es la referencia). Si cambia el original, actualizá esta copia.

Librería React para construir formularios multi-paso (wizard) a partir de una definición (`scheme`). Incluye inputs prediseñados con Tailwind, validación con React Hook Form + Yup y el estado de los pasos en Zustand. Se desarrolla y documenta con Storybook.

> **Estado:** versión 0.2.0: wizard por `scheme` con más de 30 tipos de campo, pasos especiales (términos, pago, espera, revisión, resultado), archivos con storage conectable y plugins de pago (Stripe, Lemon Squeezy, Mercado Pago, PayPal). Aún no publicada en ningún registro. Ver [Estado del proyecto](#estado-del-proyecto).

## Stack

| Área                     | Tecnología                                  |
| ------------------------ | ------------------------------------------- |
| UI                       | React 18, TypeScript (strict)               |
| Estilos                  | Tailwind CSS 3, `clsx` + `tailwind-merge`   |
| Estado de pasos          | Zustand 5                                   |
| Formularios y validación | React Hook Form 7 + Yup                     |
| Documentación            | Storybook 8 (`@storybook/react-vite`)       |
| Build                    | Vite 5 en modo librería + `vite-plugin-dts` |
| Tests                    | `bun test` + Testing Library (happy-dom), Playwright (e2e) |
| Formato y lint           | Biome 2                                     |
| Gestor de paquetes       | pnpm                                        |

## Primeros pasos

```bash
pnpm install
pnpm storybook   # http://localhost:6006
```

| Script                      | Descripción                                          |
| --------------------------- | ---------------------------------------------------- |
| `pnpm storybook`            | Storybook en desarrollo (puerto 6006)                |
| `pnpm build-storybook`      | Storybook estático                                   |
| `pnpm build`                | Build de la librería en `dist/` (ES + CJS + `.d.ts`) |
| `pnpm typecheck`            | `tsc --noEmit`                                       |
| `pnpm lint` / `pnpm format` | Biome check / check --write                         |
| `pnpm playground`           | App React de prueba (http://localhost:5173) que usa `src/` con HMR; escenarios en `?demo=<id>` |
| `pnpm e2e`                  | Tests de Playwright (`e2e/`) contra el playground. Primera vez: `npx playwright install chromium` |
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

**Stripe** — `import { stripe } from 'artisanform/payments/stripe'` (embebido: `pnpm add @stripe/stripe-js @stripe/react-stripe-js`; Checkout hospedado: sin SDK).

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

**Mercado Pago** — `import { mercadoPago } from 'artisanform/payments/mercadopago'` (embebido: `pnpm add @mercadopago/sdk-react`; Checkout Pro: sin SDK).

```tsx
mercadoPago({
  publicKey: 'TEST-…',
  // embebido (Payment Brick): tu backend crea el pago (POST /v1/payments) con el monto que calculó él
  createPayment: (req, formData) => api('/mp/payments', { req, formData }),   // → { status, id? }
  brick: { amount: (values) => 1000 },                                         // monto que muestra el brick (el servidor es la autoridad)
  // o mode: 'redirect' (Checkout Pro): tu backend crea la preferencia con estas back_urls
  // createPreference: (req, { successUrl, failureUrl, pendingUrl }) => api('/mp/preference', …), // → { url }
})
```

**PayPal** — `import { paypal } from 'artisanform/payments/paypal'` (`pnpm add @paypal/react-paypal-js`).

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
| `labels?`             | Sobrescribe cualquier texto o mensaje de validación (ver `defaultLabels`; por defecto inglés)                                            |
| `className?`          | Clases extra para el `<form>`                                                                                                             |
| `fields?`             | Registro de tipos de campo propios (ver arriba)                                                                                           |
| `stepTypes?`          | Registro de tipos de paso propios (`StepDefinition`)                                                                                      |
| `extensions?`         | Funciones y componentes locales a los que un esquema v1 hace referencia por id (`options`, `waits`, `hooks`, `renderers`, `actions`)      |
| `storage?`            | Adapter(s) de almacenamiento para campos `file`/`image` (ver arriba)                                                                      |
| `plugins?`            | `{ payments: PaymentPlugin[], navigate? }` para los pasos de pago                                                                         |

### Comportamiento del wizard

- **Siguiente** valida solo los campos del paso actual y marca sus errores; no avanza si hay alguno.
- **Finalizar** (último paso) valida todo y llama a `onSubmit` con los valores.
- `isFinalStep` se calcula a partir de la cantidad de pasos; al cambiar el `scheme` el wizard vuelve al paso 0.

## Estilos

Los componentes usan clases de Tailwind. Hay dos formas de cargarlas:

1. **Con Tailwind en tu proyecto (recomendado):** agregá el build de la librería a `content` de `tailwind.config.js` para que Tailwind genere sus clases.

   ```js
   content: ['./src/**/*.{js,ts,jsx,tsx}', './node_modules/artisanform/dist/**/*.{js,cjs}'],
   ```

2. **Sin Tailwind:** importá el CSS precompilado (incluye el reset `preflight` de Tailwind).

   ```ts
   import 'artisanform/style.css';
   ```

### Personalización

- **Color de marca:** definí estas variables CSS (fallbacks: azul de Tailwind):

  ```css
  :root {
    --artisan-primary: #7c3aed;
    --artisan-primary-dark: #5b21b6;
  }
  ```

- **Clases extra:** todos los componentes aceptan `className` (`Controls` también `buttonClassName`; `ArtisanForm` lo aplica al `<form>`).

## Instalación

`react`, `react-dom`, `react-hook-form`, `yup` y `zustand` son `peerDependencies`:

```bash
pnpm add artisanform react react-dom react-hook-form yup zustand
```

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
│   ├── commons/             cn, labels, theme
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

### Pendiente

- **CI en GitHub (AF8):** el workflow está en la rama local `chore/AF8-ci`; subirlo requiere el scope `workflow` del token (`gh auth refresh -s workflow`).
- **Release:** `develop` → `master`, publicar el paquete (registro a definir) y desplegar Storybook.
- **Proveedores reales:** los plugins se verifican con mocks de sus SDK; falta probarlos contra sandbox con credenciales de prueba.
- **Navegador:** los tests de componentes corren en happy-dom; Playwright cubre los flujos del playground (wizard, archivos, espera, pagos mock, campos).
- **UI por defecto para `ui`:** `layout`, `density`, `labelPosition` y `variant` se validan y normalizan pero todavía no se interpretan.
- Los textos por defecto están solo en inglés; para otro idioma pasá `labels` (y escribí tus propias etiquetas de campo).

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

- `master` estable, `develop` integración; no se commitea directo a ninguna.
- Una feature = una rama = un PR desde `develop`: `feat/AF<n>-slug`, `fix/AF<n>-slug`, `chore/slug` (`AF<n>` = número de issue).
- PR a `develop` con el [template](../../.github/PULL_REQUEST_TEMPLATE.md); `develop` → `master` solo en releases.
- Commits: `tipo: :emoji: descripción`, en inglés.
- Antes del PR: `pnpm lint`, `pnpm typecheck`, `pnpm build` y `bun test` limpios, y story actualizada.

## Convenciones

- Biome: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 columnas, LF.
- Un componente por carpeta con su `*.stories.tsx`; `export default`.
- Inputs con `forwardRef` cuando exponen un elemento, el binding `useArtisanField` y accesibilidad básica (`label htmlFor`, `aria-invalid`, `aria-describedby`).
- Estilos solo con Tailwind + `cn()`. Estado global solo en `useArtisanStore`.
- Todo lo generado en el repositorio (código, comentarios, docs, commits) va en inglés; la documentación en español vive en `docs/es/`. Los textos de la librería nunca están hardcodeados: los valores por defecto son inglés y todos se pueden sobrescribir con `labels`.
