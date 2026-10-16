# Changelog

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
