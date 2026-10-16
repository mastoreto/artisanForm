# Changelog

> 🌐 Versión en español de [CHANGELOG.md](../../CHANGELOG.md).

## Sin publicar (Fase 3: UI extensible)

- **Renderizado híbrido:** motor, renderer y componentes de UI están separados. Props nuevas de `ArtisanForm`: `components` (reemplazar inputs por `type` de campo, `Stepper`, `Controls`, `FieldWrapper`, `StepHeader`, `FormError`), `classNames` (clases extra por parte) y `unstyled`. Los inputs de reemplazo reciben un contrato neutral `ArtisanInputProps` (sin React Hook Form ni Zustand). Guía completa: [docs/es/ui.md](ui.md).
- **Los estilos ya no dependen de Tailwind:** la UI por defecto es CSS plano (clases `af-*`, variables `--artisan-*`, estado por `data-*`/`aria-*`), sin clases de Tailwind ni reset global. **Breaking:** `artisanform/style.css` ya no trae el preflight de Tailwind, `commons/theme.ts` desaparece y `cn()` es un wrapper fino de `clsx` (se quita `tailwind-merge`).
- **El `ui` semántico se interpreta:** `density` y `labelPosition` del formulario (y el gancho `data-layout`), `columns` del paso, `span` del campo (el `width` heredado sigue mapeando); `variant` llega a los componentes propios como `field.uiVariant`.
- **Pasos propios:** nueva `ArtisanStepApi` estable (`ctx.api`): solo escribe lo que posee, errores, `next()`/`back()` por las reglas del motor. `goTo`/`submit` de `StepContext` siguen pero no se recomiendan.
- Los registros fallan temprano, con el nombre del tipo, si una entrada está incompleta. `useWizard` (interno) concentra todo el comportamiento del wizard; `Wizard` solo dibuja.
- Escenarios nuevos del playground: layout semántico, componentes propios, extensiones con un esquema JSON y tres formas de estilizar.

## Fase 2: React Hook Form

- **Motor:** valores, registro, validación y campos repetibles corren ahora sobre React Hook Form (un `useForm` por wizard, Yup vía `@hookform/resolvers`). Formik desaparece. El contrato v1, las reglas Yup, el estado de pasos en Zustand, pagos, storage y esperas no cambian.
- **Breaking (instalación):** `react-hook-form` es ahora peer dependency (reemplaza a `formik`). Los inputs sueltos van dentro del nuevo `StandaloneForm` (en lugar de `<Formik>`); no hace falta importar React Hook Form. El wizard solo se re-renderiza ante cambios en valores que leen las condiciones, así que al tipear se re-renderiza solo el campo tipeado.
- La validación corre al cambiar; los errores se muestran cuando el campo fue tocado o se intentó "Siguiente" (como antes). `trigger` valida solo los campos del paso.
- Los campos repetibles usan `useFieldArray` con ids de fila estables.
- Un paso que deja de ser visible estando activo mueve el wizard a la misma posición (acotada); un segundo "Siguiente" mientras corre `beforeNext`, o un resultado obsoleto de `beforeNext`, ya no navegan dos veces; los borradores omiten escrituras idénticas.

## Fase 1: contrato de esquema v1

- **`ArtisanSchemaV1`**: contrato público JSON-serializable y versionado (`schemaVersion`, `id`, `revision`), con campos y pasos discriminados por `type`, ids de paso estables y configuración visual semántica. Función `defineForm` para escribirlo en TypeScript.
- **Condiciones declarativas** (`visibleWhen`): `eq neq gt gte lt lte in notIn filled empty` + `all`/`any`/`not`, sin ejecutar código. `showIf` (0.2.0) se traduce con `coerce: "string"` y se verificó equivalente a la implementación anterior.
- **`parseArtisanSchema`**: validación estructural manual y sin dependencias, con `issues` legibles (`code`, `path`) y `SchemaPolicy` para esquemas remotos.
- **`normalizeArtisanSchema`**: representación interna única (determinista e idempotente). Adaptador de 0.2.0: `kind`→`type`, `showIf`→`visibleWhen`, `width`→`ui.span`, `helperText`→`description`, ids derivados, funciones extraídas a *bindings*.
- **`extensions`** (`options`, `waits`, `hooks`, `renderers`, `actions`): un esquema referencia por id lo que es código local.
- **Snapshots de borradores** (`ArtisanSnapshotV1`): paso por id, `formId`/`formRevision`, detección de incompatibilidades con `onSnapshotConflict` (por defecto respalda y arranca limpio), restauración de borradores 0.2.0 y valores siempre JSON.
- **Compatibilidad**: `FormSchema`/`FieldSchema`/`StepSchema` quedan `@deprecated` pero siguen funcionando; no se eliminó ninguna exportación. Un formulario 0.2.0 y su equivalente v1 renderizan el mismo HTML.
- Documentación: [schema-v1.md](schema-v1.md).
- Código fuente reorganizado por capas (`schema/{contract,legacy}`, `engine/`, `components/{ArtisanForm,Controls,inputs,fields,steps}`, `integrations/{payments,storage,wait}`, tests en `__tests__/`). La API pública y los subpaths del paquete no cambian; solo los `types` de los exports `artisanform/payments/*` apuntan a los nuevos archivos de declaración.
- **Breaking:** los textos de UI por defecto (`defaultLabels`) ahora están en inglés; pasá `labels` para otro idioma. Todo el código interno, tests, fixtures, demos y stories también están en inglés; las etiquetas, nombres y títulos de un esquema siguen siendo texto libre.
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
