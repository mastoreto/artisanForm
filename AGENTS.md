# AGENTS.md — ArtisanForm

Librería React de formularios multi-paso (wizard) con inputs prediseñados. Se publica como lib (`vite build`, entry `src/index.ts`) y se desarrolla/documenta con Storybook.

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

Además: `pnpm build` (librería), `pnpm typecheck` y `bun test` (tests `*.test.ts` junto al código).
Verificación mínima de una feature: `pnpm lint` + `pnpm typecheck` + `pnpm build` + `bun test` + la story renderiza sin errores.

## Estructura

```
src/
  commons/cn/            helper cn() (clsx + tailwind-merge)
  components/
    ArtisanControls/     botones Anterior / Siguiente / Finalizar
    ArtisanForm/         contenedor wizard: scheme → pasos, validación (+ buildSchema.test.ts)
    ArtisanInputs/<Name>/<Name>.tsx + <Name>.stories.tsx
  stores/useArtisanStore.ts   step, processStep, isFinalStep
  index.ts               entry de la lib (exports públicos)
```

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
- Textos de UI en español (por ahora); código, commits e identificadores en inglés.
- Mantener simple: no agregar dependencias ni abstracciones sin necesidad concreta.

## Definición de "hecho"

1. Cumple el issue. 2. Story que muestra los estados (default, error, disabled si aplica). 3. Lint y typecheck limpios. 4. Exportado en `index.ts` si es API pública. 5. PR completado.

## Estado actual / deuda conocida

Versión 0.1.0 candidata: `ArtisanForm` por `scheme` (condicionales, async, borrador, labels, theming), inputs con Formik/Yup, build ES+CJS con peer deps, estilos distribuibles y tests (`bun test`, happy-dom). Pendiente: CI en GitHub (AF8, rama local `chore/AF8-ci`; el token de `gh` necesita scope `workflow`), publicar el paquete y desplegar Storybook. Detalle y hoja de ruta en el README.

Las tareas son issues de GitHub con el código `AF<n>` en el título (AF8 = issue #2, AF<n> = issue #n-6).

Convención de tests: `*.test.ts(x)` junto al código, `bun test` (preload en `bunfig.toml` con happy-dom), Testing Library para componentes.
