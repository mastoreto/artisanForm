# AGENTS.md — ArtisanForm

Librería React de formularios multi-paso (wizard) con inputs prediseñados. Se publica como lib (`vite build`, entry `src/index.ts`) y se desarrolla/documenta con Storybook.

## Stack

React 18 · TypeScript (strict) · Tailwind 3 · Zustand (estado de pasos) · Formik + Yup (declarados, **aún sin usar**) · Storybook 8 · Vite · pnpm (hay `pnpm-lock.yaml`; el README menciona bun, está desactualizado).

## Comandos

```bash
pnpm install
pnpm storybook         # dev en :6006
pnpm build-storybook
pnpm lint              # prettier --check
pnpm format            # prettier --write
```

No hay tests ni script de build/typecheck todavía. Hasta que existan, la verificación mínima de una feature es: `pnpm lint` + `npx tsc --noEmit` + la story renderiza sin errores.

## Estructura

```
src/
  commons/cn/            helper cn() (clsx + tailwind-merge)
  components/
    ArtisanControls/     botones Anterior / Siguiente / Finalizar
    ArtisanInputs/<Name>/<Name>.tsx + <Name>.stories.tsx
  stores/useArtisanStore.ts   step, processStep, isFinalStep, scheme
  index.ts               entry de la lib (exports públicos)
src/stories/             boilerplate de Storybook (borrable)
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

- Prettier manda (`.prettierrc`: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 cols). Correr `pnpm format` antes de commitear; no mezclar reformateo con cambios funcionales.
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

Ver "Nivel de funcionalidad" en la última revisión; resumen: los inputs son maquetas visuales sin validación real, `index.ts` es un placeholder y `scheme` del store no se usa. Prioridad: conectar Formik/Yup, `scheme` → render dinámico, y exportar la API.
