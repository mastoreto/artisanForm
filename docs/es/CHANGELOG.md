# Changelog

> 🌐 Versión en español de [CHANGELOG.md](../../CHANGELOG.md).

## Sin publicar (Planificación)

- **Plan de evolución (AF83):** [docs/es/planning/artisanform-evolution.md](planning/artisanform-evolution.md) audita el estado actual y planifica la API headless (`useArtisanWizard`), valores tipados, workflows y migraciones de snapshots, con las decisiones tomadas. AGENTS.md lista `apps/docs` y la documentación llama `useArtisanWizard` al futuro hook headless.

## Sin publicar (Robustez)

- **Integraciones (AF77):** un mensaje de `wait` con un `status` desconocido ahora hace fallar el paso en vez de esperar al timeout, y un `websocket()` que se cierra antes de un estado final falla (cerrarlo nosotros no es un fallo). `cloudinary()` lanza un error de subida claro cuando la respuesta no es el JSON esperado. La idempotency key de pago usa `crypto.getRandomValues` cuando `randomUUID` no está disponible (contextos no seguros) en vez de `Math.random`, y falla si no hay `crypto`. La guía de archivos aclara que `accept` y `maxSize` no son un control de seguridad.

## Sin publicar (Seguridad)

- **Endurecimiento del schema (AF76):** `parseArtisanSchema` rechaza un `href` que no sea `http:`, `https:`, `mailto:` o relativo (`unsafe-url`, así que los enlaces `javascript:` se rechazan) y los nombres de campo que sean claves de prototipo o usen sintaxis de ruta (`invalid-name`). El render también omite un `href` inseguro, lo que cubre los schemas 0.2.0. Los schemas que usaban esos valores ahora fallan la validación.

## Sin publicar (Seguridad: cambio de comportamiento)

- **La URL de retorno del pago ya no es de confianza (AF78):** `resume()` de los plugins de redirección (Stripe, Mercado Pago, Lemon Squeezy y el mock) ahora informa `processing` donde antes informaba `succeeded`, porque cualquiera podía falsificar `?stripe_status=success` y hacer que el wizard registre un paso pagado. Los flujos embebidos (`render` → `onResult`) no cambian. **Si usás un checkout por redirección, agregá un paso `pending` después del de pago** para que tu backend confirme el pago; el valor `payment` del payload enviado nunca debe tratarse como prueba de pago.

## Sin publicar (Documentación)

- **Guías nuevas** (inglés en `docs/`, español en `docs/es/`): [pagos](payments.md) (el principio de seguridad, flujos, una checklist de producción), [archivos y storage](files.md), [accesibilidad y entornos probados](accessibility.md) (qué viene incluido, qué verifica axe, qué todavía no está verificado, navegadores/React/Node cubiertos por el CI) y [release](releasing.md) (los cinco paquetes, el workflow `Release`, publicar a mano, Trusted Publishing y una tabla de resolución de problemas con los errores de npm vistos en el primer release).
- **README y AGENTS.md:** estado beta, instalación con `@beta` y los kits `@beardartisans/ui-*`, un índice de documentación y un "Estado del proyecto" actualizado.
- **Sitio de docs:** el sitio Starlight (en/es) ahora incluye todas las guías, con los enlaces entre guías reescritos para que funcionen bajo cualquier ruta base. Se despliega con Vercel (raíz del proyecto `apps/docs`). El CI también compila Storybook, que no está alojado en ningún lado; se levanta con `bun run storybook`.
- **Guía de release:** documenta que la primera publicación de un paquete también fija el tag `latest`, así que hasta un release estable `npm install artisanform` instala la beta.

## Sin publicar (Primera beta: 0.3.0-beta.0)

- **Versión:** `0.3.0-beta.0` para el núcleo **y** los cuatro kits de npm (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`, `ui-scss`), publicados juntos con la misma versión; piden `artisanform@^0.3.0-beta.0` como peer. Cada kit tiene ahora su propio `README`, `LICENSE`, metadatos de repositorio y `publishConfig.access: public` (obligatorio en paquetes con scope). `ui-shadcn` sigue privado (es un item de registry para copiar y pegar).
- **Scope y ramas:** los kits se publican bajo la organización de npm `@beardartisans` (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`, `ui-scss`); el núcleo sigue siendo `artisanform` (sin scope). La rama de release ahora es `main` (antes `master`): el CI y la documentación la siguen, y el workflow `Release` rechaza una publicación real desde cualquier otra rama (un dry run funciona en cualquiera).
- **Corrección de accesibilidad encontrada por la nueva suite de axe:** el color primario por defecto era `#3b82f6` (3,68:1 contra el texto blanco del botón, por debajo de WCAG AA); ahora es `#2563eb` (5,17:1), en `artisanform.css` y en el kit de Sass. Sigue siendo sobrescribible con `--artisan-primary`.
- **Tests:** `e2e/a11y.spec.ts` ejecuta axe-core (WCAG 2.0/2.1 A y AA) sobre el wizard (también con errores de validación visibles), campos, repetibles, layout y archivos. Playwright tiene proyectos `chromium`, `firefox` y `webkit`: en local solo corre Chromium; con `ARTISAN_BROWSERS=chromium,firefox,webkit` corren todos. El CI añade un job `e2e-browsers` para Firefox y WebKit.
- **Empaquetado:** `bun run check:pack` verifica el tarball del núcleo y de cada kit (solo la salida compilada, `LICENSE`, `README.md`, `package.json`; sin fuentes, tests ni stories; versión de los kits igual a la del núcleo) y corre en CI y en `prepublishOnly`. El test de consumidor también instala los kits bootstrap, mui y tailwind y los tipa contra la prop `kit`.
- **Release:** un workflow manual `Release` (`workflow_dispatch`) ejecuta todas las verificaciones y luego publica el núcleo y los kits con `npm publish --provenance --tag <tag>`. Necesita el secreto `NPM_TOKEN` del repositorio (un token granular con lectura/escritura en todos los paquetes, que cubra `artisanform` y la organización `@beardartisans`) y es un dry run salvo que se desactive `dry-run`. Tras publicar, verifica los paquetes del registro con `ARTISAN_SPEC=<versión> node scripts/consumer-test.mjs 19`.

## Sin publicar (Preparación del release)

- **Metadatos del paquete:** `license` (MIT, más el archivo `LICENSE`), `description`, `keywords`, `repository`, `homepage`, `bugs`, `engines` (Node >= 20.19), `publishConfig.access` y un guard `prepublishOnly` (build + `check:dist` + `check:package` + tests).
- **Bun en todos lados:** README, docs, Playwright y scripts ya no usan pnpm para los comandos de contribución; las instalaciones de consumidores se documentan con `npm install` y los scripts de prueba de consumidor usan `npm` (siempre disponible en CI).
- **Lint:** `react-hooks/exhaustive-deps` está desactivada para los proveedores de pago, cuyos efectos corren una sola vez al montar por diseño (re-ejecutarlos crearía un segundo pago). Se configura en `eslint.config.js` porque el React Compiler omite los componentes con comentarios `eslint-disable`.

## Sin publicar (Fase 5: kits de UI)

- **Prop `kit`:** un `ArtisanUiKit` (`components`, `classNames`, `unstyled`, `labels`) con `defineUiKit` / `mergeUiKits`. Precedencia: UI por defecto < kit < props explícitas. Guía: [docs/es/ui.md](ui.md).
- **Paquetes del workspace:** `@beardartisans/ui-bootstrap`, `@beardartisans/ui-mui`, `@beardartisans/ui-tailwind`, `@beardartisans/ui-scss` y un item de registry de shadcn (`packages/ui-shadcn`). El núcleo no depende de ninguno.
- **Corrección de accesibilidad hallada por la nueva suite de conformidad:** la etiqueta del `select` nativo ahora es un `<label for>` real y el select define `id` y `aria-invalid`.

## Sin publicar (Fase 4: stack moderno)

- **Stack:** React 19 (rango de peer `^18.3.1 || ^19.0.0`, ambas probadas), Vite 8, TypeScript 6, Storybook 10, `@vitejs/plugin-react` 6, ESLint 10 con las reglas de React Hooks / Compiler (`bun run lint:react`). Tailwind sigue en 3 (solo lo usan el playground y Storybook). Se eliminaron `sass-embedded`, `ts-node` y `vite-tsconfig-paths`, que no se usaban.
- **React Compiler (Rust):** la librería se compila con `oxc-transform-react` (`react-compiler.ts`, `target: '18'`), así que quien la consume no configura nada. `react-compiler-runtime` es una dependencia y queda externo. `ARTISAN_COMPILER=off` lo desactiva. Correcciones que señaló el compilador: refs y lecturas mutables durante el render (`useArtisanForm`, `useArtisanField`, `Combobox`, `PaymentStep`), dependencias de memo desactualizadas en `ArtisanForm`. `useWizard` queda fuera a propósito (`getValues()` durante el render).
- **Cambio incompatible (empaquetado):** solo ESM; los archivos son `dist/index.js` y `dist/payments/<nombre>.js`; se quitó `main`/CJS; los `.d.ts` usan especificadores `.js` explícitos (listos para Node16/NodeNext); `Controls` ya no referencia el espacio de nombres global `JSX`; se publican source maps.
- **Verificación:** `bun run check:dist` (salida compilada, imports declarados, sin React empaquetado), `bun run check:package` (`publint`, `attw`), tests de consumo con el tarball en apps Vite limpias en React 18 y 19 (+ SSR + navegador); la CI corre e2e con el compilador activo e inactivo en Node 22/24.

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
- **Tooling:** Biome reemplaza a Prettier; playground con `bun run playground`; tests e2e con Playwright.

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
