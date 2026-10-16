# AGENTS.md — ArtisanForm

> 🌐 Versión en español de [AGENTS.md](../../AGENTS.md) (el original, en inglés, es el que rige). Si cambia el original, actualizá esta copia.

Librería React de formularios multi-paso (wizard) con inputs prediseñados. Se publica como lib (`vite build`, entry `src/index.ts`) y se desarrolla/documenta con Storybook.

## Idioma

- **Todo lo que se genera en este repositorio va en inglés**: código, identificadores, comentarios, JSDoc, nombres de tests, mensajes de commit, texto de PR e issues, `README.md`, `AGENTS.md`, `CHANGELOG.md` y todo lo que está bajo `docs/`.
- **Las versiones en español viven en [`docs/es/`](.)** y reflejan los documentos en inglés: [`README`](README.md), [`AGENTS`](AGENTS.md), [`CHANGELOG`](CHANGELOG.md) y [`schema v1`](schema-v1.md). Leelas cuando necesites el texto en español; **cuando cambies un documento en inglés, actualizá su copia en español en el mismo cambio**.
- Excepción: los **textos de interfaz por defecto** (`src/commons/labels.ts`, mensajes de validación, textos de demo del playground y de las stories) están en español. Es un valor por defecto del producto, no documentación: se configura con la prop `labels` y no debe traducirse como parte de un cambio de docs.
- A las personas se les responde en el idioma en que escriben; los artefactos del repositorio quedan en inglés.

## Stack

React 18 · TypeScript (strict) · Tailwind 3 · Zustand (estado de pasos) · Formik + Yup (validación) · Storybook 8 · Vite · pnpm (hay `pnpm-lock.yaml`).

## Comandos

```bash
pnpm install
pnpm storybook         # dev en :6006
pnpm build-storybook
pnpm lint              # biome check
pnpm format            # biome check --write
```

Además: `pnpm playground` (app de prueba en vivo, escenarios en `playground/src/scenarios/`), `pnpm e2e` (Playwright, `e2e/`), `pnpm build` (librería), `pnpm typecheck` y `bun test` (tests `*.test.ts(x)` junto al código).
Verificación mínima de un cambio: `pnpm lint` + `pnpm typecheck` + `pnpm build` + `bun test` + la story renderiza sin errores. Verificá el **código de salida** de cada comando, no solo el final de su salida.

## Estructura

```
src/
  index.ts               entry de la lib (solo exports públicos)
  schema/                contrato público v1 (JSON). NO importa react/formik/yup/zustand (test + regla de Biome)
    contract/            tipos, fields, steps, define, specs, conditions, json, errors
    legacy/              la forma 0.2.0 (types.ts) + el adaptador a v1 (adapter.ts)
    parser.ts · normalize.ts
    __tests__/           + fixtures/ (esquemas 0.2.0 que reflejan el playground)
  persistence/           ArtisanSnapshotV1 y storage de borradores (tampoco importa el motor)
  engine/                ejecuta un esquema; acá viven Formik/Yup/Zustand
    project.ts           esquema normalizado → la forma que consume el wizard (la única costura que conoce ambas)
    buildSchema.ts · conditions.ts · draft.ts · extensions.ts · store/useArtisanStore.ts
  components/
    ArtisanForm/         ArtisanForm.tsx (público) · Wizard.tsx · Stepper.tsx · __tests__/ (integración)
    Controls/            botones Anterior / Siguiente / Finalizar
    inputs/<Name>/       <Name>.tsx + <Name>.stories.tsx, una carpeta por input
    fields/registry.tsx  registro de campos (render + valores iniciales + reglas por tipo)
    steps/               registry.tsx (registro de pasos) · PaymentStep.tsx · StatusPanel.tsx
  integrations/          capacidades opcionales con su propio contrato
    payments/            types, mock, Loading, providers/{stripe,lemonsqueezy,mercadopago,paypal} (subpaths del paquete)
    storage/             StorageAdapter + presignedPut, cloudinary, mock
    wait/                WaitStrategy (polling, sse, websocket, callback)
  commons/               cn.ts, labels.ts (textos), theme.ts (color de marca)
  styles/global.css
  __tests__/setup.ts     preload de happy-dom para bun test
playground/              app React de prueba (escenarios en src/scenarios)
e2e/                     tests de Playwright
docs/                    guías en inglés; docs/es/ tiene las versiones en español
```

Los tests viven en una carpeta `__tests__/` junto al código que cubren (las stories quedan al lado de su componente). Los archivos de configuración de la raíz (`vite`, `tailwind`, `postcss`, `biome`, `tsconfig`, `bunfig`, `playwright`) se quedan ahí porque las herramientas los buscan en ese lugar.

El esquema se normaliza (`schema/normalize.ts`) y se proyecta al motor (`engine/project.ts`): ahí está la única costura que conoce ambas formas. Un campo o paso nuevo en el contrato v1 necesita: su tipo en `schema/contract/fields.ts|steps.ts`, su entrada en `schema/contract/specs.ts` (el compilador lo exige), el parser y la proyección. Guía: [`schema-v1.md`](schema-v1.md).

Un tipo de campo nuevo = una `FieldDefinition` en `components/fields/registry.tsx` (render, valores iniciales, reglas) + su componente en `components/inputs`. Un tipo de paso nuevo = una `StepDefinition` en `components/steps/registry.tsx`. Las pantallas de estado (resultado, espera, pago) usan `StatusPanel` (icono/spinner + mensaje + acciones) para verse igual.

## Flujo de trabajo por ramas

- `master`: estable / releases. `develop`: integración. **Nunca commitear directo a ninguna de las dos.**
- Una feature = una rama = un PR, partiendo de `develop`: `feat/AF<n>-<slug-corto>` (ej. `feat/AF3-formik-integration`). Fixes: `fix/AF<n>-<slug>`. Chores: `chore/<slug>`.
- `AF<n>` es el número del issue (usar `.github/ISSUE_TEMPLATE`). Sin issue, no hay rama.
- Ramas chicas y de corta vida: un PR debería poder revisarse de una sentada. Si crece, partir en dos.
- PR hacia `develop` usando `.github/PULL_REQUEST_TEMPLATE.md` completo. `develop` → `master` solo para release.
- Antes de abrir el PR: rebase/merge de `develop`, `pnpm lint` limpio, story actualizada.
- Commits: `tipo: :emoji: descripción` en inglés (como el historial: `feat: :sparkles: ...`, `chore: :memo: ...`). Un commit por cambio lógico.
- Agentes: no hacen push, merge ni PR sin que se pida explícitamente.

## Convenciones de código

- Biome manda (`biome.jsonc`: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 cols). Correr `pnpm format` antes de commitear; no mezclar reformateo con cambios funcionales.
- Un componente por carpeta, `export default`, con su `*.stories.tsx` al lado.
- Inputs: `forwardRef`, props tipadas con `interface`, `id` + `label` obligatorios, `className` opcional mezclado vía `cn()`. Accesibilidad básica obligatoria (`label htmlFor`, `aria-invalid`/`aria-describedby` en errores).
- Estilos solo con Tailwind + `cn()`. Nada de CSS nuevo salvo `src/styles/global.css`.
- Estado global solo en `useArtisanStore`; estado local de UI en el componente. Nada de estado hardcodeado de demo dentro de componentes.
- Todo lo público se exporta desde `src/index.ts`.
- Mantener simple: no agregar dependencias ni abstracciones sin necesidad concreta.

## Definición de "hecho"

1. Cumple el issue. 2. Story que muestra los estados (default, error, disabled si aplica). 3. Lint y typecheck limpios. 4. Exportado en `index.ts` si es API pública. 5. PR completado.

## Estado actual / deuda conocida

Versión 0.2.0 más el contrato de esquema v1 sin publicar: un wizard guiado por un `scheme` (`FormSchema` 0.2.0 o `ArtisanSchemaV1`) con registros extensibles de campos y pasos, pagos por plugin (Stripe, Lemon Squeezy, Mercado Pago, PayPal), archivos con `StorageAdapter`, esperas con `WaitStrategy`, snapshots de borradores versionados, Biome, playground y tests e2e. Pendiente: CI en GitHub (AF8, rama local `chore/AF8-ci`; el token de `gh` necesita el scope `workflow`), publicar el paquete, desplegar Storybook, probar los plugins de pago contra sandbox con credenciales de prueba y que la UI por defecto interprete `ui.layout`/`density`/`labelPosition`. Detalle y hoja de ruta en el README.

Las tareas son issues de GitHub con el código `AF<n>` en el título (número de issue = n − 6).

Convenciones de tests: `*.test.ts(x)` junto al código con `bun test` (happy-dom + Testing Library, preload en `bunfig.toml`); flujos en navegador real en `e2e/` con Playwright contra `pnpm playground`. Si el playground ya corre y los cambios no se reflejan, reinicialo (HMR puede quedar desactualizado).

Principios que no se negocian: la librería **no maneja secretos ni datos de tarjeta**; montos, órdenes y firmas de subida los resuelve el backend del usuario; los SDK de terceros son peers opcionales en subpaths; el contrato público del esquema se mantiene serializable e independiente del motor de formularios.
