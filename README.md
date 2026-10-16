# ArtisanForm

Librería React para construir formularios multi-paso (wizard) a partir de una definición (`scheme`). Incluye inputs prediseñados con Tailwind, validación con Formik + Yup y el estado de los pasos en Zustand. Se desarrolla y documenta con Storybook.

> **Estado:** versión 0.1.0 candidata: funcional y empaquetable (ES + CJS, estilos incluidos). Aún no publicada en ningún registro. Ver [Estado del proyecto](#estado-del-proyecto).

## Stack

| Área                     | Tecnología                                  |
| ------------------------ | ------------------------------------------- |
| UI                       | React 18, TypeScript (strict)               |
| Estilos                  | Tailwind CSS 3, `clsx` + `tailwind-merge`   |
| Estado de pasos          | Zustand 5                                   |
| Formularios y validación | Formik 2 + Yup                              |
| Documentación            | Storybook 8 (`@storybook/react-vite`)       |
| Build                    | Vite 5 en modo librería + `vite-plugin-dts` |
| Tests                    | `pnpm playground` | App React de prueba (http://localhost:5173) que usa `src/` con HMR; escenarios en `?demo=<id>` |
| `pnpm e2e` | Tests de Playwright (`e2e/`) contra el playground. Primera vez: `npx playwright install chromium` |
| `bun test`                                  |
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
| `pnpm build`                | Build de la librería en `dist/` (ES + UMD + `.d.ts`) |
| `pnpm typecheck`            | `tsc --noEmit`                                       |
| `pnpm lint` / `pnpm format` | Biome check / check --write                         |
| `bun test`                  | Tests (`*.test.ts`)                                  |

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

### `FormSchema`

| Tipo          | Campos                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FormSchema`  | `steps: StepSchema[]`                                                                                                                                                                                                           |
| `StepSchema`  | `title`, `fields: FieldSchema[]`                                                                                                                                                                                                |
| `FieldSchema` | `type`, `name`, `label`, `placeholder?`, `options?`, `required?`, `min?`, `max?`, `pattern?`, `defaultValue?`, `autoComplete?`, `inputMode?`, `readOnly?`, `maxLength?`, `step?`, `minDate?`, `maxDate?`, `disabled?`, `helperText?`, `sameAs?`, `showIf?`, `dependentName?`, `dependentOptions?`, `loadDependentOptions?` |

Tipos de campo (`type`): `text`, `email`, `number`, `tel`, `url`, `textarea`, `password`, `date`, `checkbox`, `switch`, `file`, `image`, `select`, `dynamicSelect`, `check`, `radio`.

- `required` → obligatorio (en `check`, al menos una opción).
- `min` / `max` → largo del texto, o valor numérico en `number`. En campos opcionales vacíos no se validan.
- `pattern` → fuente de una expresión regular (ej. `'^[A-Z]{3}$'`). `email` valida formato de correo.
- `checkbox`/`switch` guardan un booleano; con `required` deben estar activados.
- `autoComplete`, `inputMode`, `readOnly`, `maxLength`, `step` se pasan al elemento nativo; `date` acepta `minDate`/`maxDate` (`YYYY-MM-DD`).
- `defaultValue` → valor inicial (array en `check`, booleano en `checkbox`/`switch`). `disabled` y `helperText` aplican a todos los tipos.
- `dynamicSelect` guarda dos valores: `name` (primer select) y `dependentName` (segundo), cuyas opciones salen de `dependentOptions[valorDelPrimero]` o, si es asíncrono, de `loadDependentOptions(valorDelPrimero)` (devuelve una promesa de opciones; muestra estados de carga y error).

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
- Resultados: `succeeded` avanza; `processing` avanza para que un paso `pending` lo confirme (webhook); `failed` muestra el error con "Reintentar" (nueva `idempotencyKey`) y "Volver".

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

| Prop                  | Descripción                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| `scheme`              | Definición del formulario (obligatoria)                                                               |
| `onSubmit(values)`    | Se llama al finalizar. Si devuelve una promesa, "Finalizar" queda deshabilitado hasta que se resuelva |
| `initialValues?`      | Valores iniciales por nombre de campo; pisan los `defaultValue` del scheme                            |
| `onChange?(values)`   | Se llama con todos los valores en cada cambio                                                         |
| `onStepChange?(step)` | Se llama con el índice del nuevo paso                                                                 |
| `step?`               | Lleva el wizard a ese paso cuando cambia (combinar con `onStepChange`)                                |

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

`react`, `react-dom`, `formik`, `yup` y `zustand` son `peerDependencies`:

```bash
pnpm add artisanform react react-dom formik yup zustand
```

## API pública (`src/index.ts`)

`ArtisanForm`, `Controls`, `TextInput`, `Textarea`, `Password`, `DateInput`, `Select`, `DynamicSelect`, `Check`, `Radio`, `useArtisanStore`, `cn`, `defaultLabels` y los tipos `ArtisanLabels`, `FormSchema`, `StepSchema`, `FieldSchema`.

Los inputs sueltos usan `useField` de Formik: reciben `name` (no `value`/`onChange`) y **deben renderizarse dentro de un `<Formik>`**. Muestran el error de Yup cuando el campo fue tocado.

## Estructura

```
.
├── .github/                 Templates de issues y PR
├── .storybook/              Config de Storybook + withFormik (decorator para stories)
├── src/
│   ├── commons/cn/          Helper cn() (clsx + tailwind-merge)
│   ├── components/
│   │   ├── ArtisanControls/ Botones Anterior / Siguiente / Finalizar
│   │   ├── ArtisanForm/     Contenedor: types, buildSchema (+ test), ArtisanForm
│   │   └── ArtisanInputs/   Text, Password, Date, Select, DynamicSelect, Check, Radio
│   ├── stores/              useArtisanStore (step, processStep, isFinalStep)
│   ├── styles/global.css    Directivas de Tailwind
│   └── index.ts             Entry de la librería
├── AGENTS.md                Forma de trabajo (humanos y agentes)
└── vite.config.ts · tailwind.config.js · tsconfig.json · biome.jsonc
```

## Estado del proyecto

### Hecho

- Store de pasos, `Controls` y 7 inputs integrados con Formik/Yup.
- Contenedor `ArtisanForm` dirigido por `scheme`, con validación por paso.
- `DynamicSelect` con opciones dependientes configurables.
- API exportada y build de la librería (ES + UMD + tipos).
- Stories de cada componente y tests de `buildSchema`.

### Hoja de ruta

Cada tarea es un issue de GitHub (`AF<n>` en el título) y una rama desde `develop`.

| Etapa                 | Tareas                                                                                                                                                                                                                                                             | Estado                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| 1. Hacerla consumible | [AF8](https://github.com/mastoreto/artisanForm/issues/2) CI · [AF9](https://github.com/mastoreto/artisanForm/issues/3) CSS · [AF10](https://github.com/mastoreto/artisanForm/issues/4) peer deps · [AF11](https://github.com/mastoreto/artisanForm/issues/5) tests | AF9–11 hechas; **AF8 pendiente**    |
| 2. Núcleo             | [AF12](https://github.com/mastoreto/artisanForm/issues/6) estado por instancia · [AF13](https://github.com/mastoreto/artisanForm/issues/7) validaciones · [AF14](https://github.com/mastoreto/artisanForm/issues/8) API                                            | Hechas                              |
| 3. Experiencia        | [AF15](https://github.com/mastoreto/artisanForm/issues/9) accesibilidad · [AF16](https://github.com/mastoreto/artisanForm/issues/10) labels · [AF17](https://github.com/mastoreto/artisanForm/issues/11) theming                                                   | Hechas                              |
| 4. Avanzado           | [AF18](https://github.com/mastoreto/artisanForm/issues/12) condicionales · [AF19](https://github.com/mastoreto/artisanForm/issues/13) opciones async · [AF20](https://github.com/mastoreto/artisanForm/issues/14) borrador                                         | Hechas                              |
| 5. Release            | [AF21](https://github.com/mastoreto/artisanForm/issues/15) versión 0.1.0                                                                                                                                                                                           | CHANGELOG listo; **falta publicar** |

Pendiente: AF8 (el workflow está en la rama local `chore/AF8-ci`; falta el scope `workflow` del token de GitHub para subirlo), `develop` → `master`, publicar el paquete y desplegar Storybook (requiere decidir registro y hosting).

### Brechas conocidas

- Sin CI en GitHub (AF8) ni Storybook desplegado.
- Paquete sin publicar en ningún registro.
- Sin tests visuales; los tests corren en happy-dom, no en un navegador real.
- Validaciones cruzadas limitadas a `sameAs`.

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

## Flujo de trabajo

Detalle en [AGENTS.md](AGENTS.md). Resumen:

- `master` estable, `develop` integración; no se commitea directo a ninguna.
- Una feature = una rama = un PR desde `develop`: `feat/AF<n>-slug`, `fix/AF<n>-slug`, `chore/slug` (`AF<n>` = número de issue).
- PR a `develop` con el [template](.github/PULL_REQUEST_TEMPLATE.md); `develop` → `master` solo en releases.
- Commits: `tipo: :emoji: descripción`.
- Antes del PR: `pnpm lint`, `pnpm typecheck`, `pnpm build` y `bun test` limpios, y story actualizada.

## Convenciones

- Biome: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 columnas, LF.
- Un componente por carpeta con su `*.stories.tsx`; `export default`.
- Inputs con `forwardRef` cuando exponen un elemento, `useField` de Formik y accesibilidad básica (`label htmlFor`, `aria-invalid`, `aria-describedby`).
- Estilos solo con Tailwind + `cn()`. Estado global solo en `useArtisanStore`.
- UI en español; código, commits e identificadores en inglés.
