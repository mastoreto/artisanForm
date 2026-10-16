# Changelog

> 🌐 Versión en español de [CHANGELOG.md](../../CHANGELOG.md).

## Sin publicar (Fase 1: contrato de esquema v1)

- **`ArtisanSchemaV1`**: contrato público JSON-serializable y versionado (`schemaVersion`, `id`, `revision`), con campos y pasos discriminados por `type`, ids de paso estables y configuración visual semántica. Función `defineForm` para escribirlo en TypeScript.
- **Condiciones declarativas** (`visibleWhen`): `eq neq gt gte lt lte in notIn filled empty` + `all`/`any`/`not`, sin ejecutar código. `showIf` (0.2.0) se traduce con `coerce: "string"` y se verificó equivalente a la implementación anterior.
- **`parseArtisanSchema`**: validación estructural manual y sin dependencias, con `issues` legibles (`code`, `path`) y `SchemaPolicy` para esquemas remotos.
- **`normalizeArtisanSchema`**: representación interna única (determinista e idempotente). Adaptador de 0.2.0: `kind`→`type`, `showIf`→`visibleWhen`, `width`→`ui.span`, `helperText`→`description`, ids derivados, funciones extraídas a *bindings*.
- **`extensions`** (`options`, `waits`, `hooks`, `renderers`, `actions`): un esquema referencia por id lo que es código local.
- **Snapshots de borradores** (`ArtisanSnapshotV1`): paso por id, `formId`/`formRevision`, detección de incompatibilidades con `onSnapshotConflict` (por defecto respalda y arranca limpio), restauración de borradores 0.2.0 y valores siempre JSON.
- **Compatibilidad**: `FormSchema`/`FieldSchema`/`StepSchema` quedan `@deprecated` pero siguen funcionando; no se eliminó ninguna exportación. Un formulario 0.2.0 y su equivalente v1 renderizan el mismo HTML.
- Documentación: [schema-v1.md](schema-v1.md).
- Idioma de la documentación: ahora todo se escribe en inglés; las versiones en español viven en este directorio (`docs/es/`).

## 0.2.0 (sin publicar)

- **Campos nuevos:** `checkbox`, `switch`, `tel`, `url`, `time`, `datetime`, `month`, `daterange`, `range`, `rating`, `otp`, `combobox`, `multiselect`, `array` (repetibles), `file`/`image`, y de contenido (`heading`, `paragraph`, `callout`, `divider`). Máscaras, `prefix`/`suffix`, atributos nativos y `width: 'half'`.
- **Registros extensibles:** `fields` (tipos de campo propios) y `stepTypes` (tipos de paso propios).
- **Pasos especiales:** `terms`, `payment`, `pending`, `review`, `result` y `custom`; hooks `beforeNext`/`onEnter`/`controls`; estado de envío con reintento.
- **Archivos:** `StorageAdapter` con `presignedPut` (S3/R2/Backblaze) y `cloudinary`; progreso, cancelar, reintentar, previews, arrastrar y soltar.
- **Pagos:** `PaymentPlugin` (embebido y redirect, idempotencia, reanudación) con plugins de Stripe, Lemon Squeezy, Mercado Pago y PayPal en `artisanform/payments/*` (SDK como peers opcionales).
- **Espera:** `WaitStrategy` con `polling`, `sse`, `websocket` y `callback`.
- **Tooling:** Biome reemplaza a Prettier; playground con `pnpm playground`; tests e2e con Playwright.

## 0.1.0 (sin publicar)

Primera versión candidata.

- `ArtisanForm`: wizard dirigido por `scheme` con validación por paso (Formik + Yup).
- Inputs: Text (text/email/number), Textarea, Password, Date, Select, DynamicSelect (mapa fijo o asíncrono), Check, Radio.
- Scheme: `required`, `min`, `max`, `pattern`, `defaultValue`, `disabled`, `helperText`, `sameAs`, `showIf` (campos y pasos).
- API: `initialValues`, `onChange`, `onStepChange`, `step`, `persistKey` (borrador en localStorage), `labels`, `className`.
- Estado de pasos por instancia (varios formularios por página).
- Accesibilidad: indicador de progreso, foco al primer error, roles ARIA en grupos.
- Estilos: `artisanform/style.css` precompilado o Tailwind propio; color de marca por variables CSS.
- Paquete ES + CJS con `peerDependencies` (`react`, `react-dom`, `formik`, `yup`, `zustand`).
