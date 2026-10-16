# ArtisanForm

Librería React para construir formularios multi-paso (wizard) con inputs prediseñados, estilizados con Tailwind y con el estado de los pasos manejado por Zustand. Se desarrolla y documenta con Storybook.

> **Estado: en desarrollo temprano (~15–20 %).** Hoy hay componentes visuales y un store de pasos, pero la librería todavía no exporta nada utilizable ni valida datos. Ver [Estado del proyecto](#estado-del-proyecto).

## Stack

| Área | Tecnología |
| --- | --- |
| UI | React 18, TypeScript (strict) |
| Estilos | Tailwind CSS 3, `clsx` + `tailwind-merge` |
| Estado | Zustand 5 |
| Formularios | Formik 2 + Yup (instalados, **aún sin usar**) |
| Documentación | Storybook 8 (`@storybook/react-vite`) |
| Build | Vite 5 en modo librería + `vite-plugin-dts` |
| Formato | Prettier 3 |
| Gestor de paquetes | pnpm (`pnpm-lock.yaml`) |

## Primeros pasos

```bash
pnpm install
pnpm storybook   # http://localhost:6006
```

### Scripts

| Script | Descripción |
| --- | --- |
| `pnpm storybook` | Storybook en modo desarrollo (puerto 6006) |
| `pnpm build-storybook` | Genera el Storybook estático |
| `pnpm lint` | `prettier --check .` |
| `pnpm format` | `prettier --write .` |

No hay todavía tests, script de build de la librería ni typecheck. Mientras tanto, verificar con `pnpm lint`, `npx tsc --noEmit` y que la story del componente renderice sin errores.

## Estructura del proyecto

```
.
├── .github/                 Templates de issues (bug, feature) y de PR
├── .storybook/              Configuración de Storybook
├── src/
│   ├── commons/cn/          Helper cn() (clsx + tailwind-merge)
│   ├── components/
│   │   ├── ArtisanControls/ Botones de navegación del wizard
│   │   └── ArtisanInputs/   Un input por carpeta (+ su story)
│   ├── stores/              useArtisanStore (Zustand)
│   ├── stories/             Boilerplate de Storybook (borrable)
│   ├── styles/global.css    Directivas de Tailwind
│   └── index.ts             Entry de la librería (hoy es un placeholder)
├── AGENTS.md                Forma de trabajo (humanos y agentes)
├── tailwind.config.js · postcss.config.cjs · vite.config.ts · tsconfig.json
└── .prettierrc
```

## Componentes

### Store: `useArtisanStore`

`src/stores/useArtisanStore.ts`

| Estado | Tipo | Descripción |
| --- | --- | --- |
| `step` | `number` | Paso actual (inicia en 0) |
| `processStep` | `number` | Paso dentro del proceso (inicia en 0) |
| `isFinalStep` | `boolean` | Indica si se está en el último paso |
| `scheme` | `object` | Definición del formulario (**reservado, no se usa todavía**) |

Acciones: `setStep(n)`, `setProcessStep(n)`, `setIsFinalStep(bool)`.

### `Controls`

`src/components/ArtisanControls/Controls.tsx`

Barra de navegación del wizard conectada al store:

- **Anterior**: visible si `step > 0` y `processStep > 0`; decrementa ambos.
- **Siguiente**: visible si no es el paso final; incrementa ambos.
- **Finalizar**: visible solo en el paso final (hoy hace `console.log('Finalizar')`).

### `ArtisanInputs`

Todos viven en `src/components/ArtisanInputs/<Nombre>/` con su `*.stories.tsx`.

| Componente | Descripción | Notas actuales |
| --- | --- | --- |
| `Text` | Input de texto con label | Muestra siempre un error de ejemplo |
| `Password` | Input de contraseña con label | Muestra siempre un error de ejemplo |
| `Date` | Input de fecha con label | Muestra siempre un error de ejemplo |
| `Check` | Grupo de checkboxes (`useImperativeHandle`) | Estado local |
| `Radio` | Grupo de radios (`useImperativeHandle`) | Estado local |
| `Select` | Select simple | — |
| `DynamicSelect` | Select con un segundo select dependiente | Opciones dependientes hardcodeadas (placeholder) |

Convención de props de los inputs de texto: `id`, `label`, `value`, `onChange`, `placeholder?`, `className?` (se mezcla con `cn()`).

### Helper `cn`

`src/commons/cn/index.ts`: combina clases con `clsx` y resuelve conflictos de Tailwind con `tailwind-merge`.

## Estado del proyecto

### Qué hay
- Store de pasos y componente `Controls`.
- 7 inputs con sus stories de Storybook.
- Tailwind, Prettier y configuración de build de librería con Vite.
- Templates de issue y PR.

### Qué falta
- **Exportar la API**: `src/index.ts` es un `console.log`; la librería no expone componentes.
- **Validación**: Formik y Yup están en `package.json` pero no se usan.
- **Errores falsos**: Text, Password y Date inicializan el error con `'Error Message'`.
- **`scheme`**: no se lee; no se puede generar un formulario desde una definición.
- **Contenedor `ArtisanForm`**: no existe un componente que renderice el paso actual ni calcule `isFinalStep`.
- **Navegación**: `Controls` avanza sin límites ni validación; "Finalizar" no envía nada.
- **DynamicSelect**: lógica de ejemplo y no usa el `ref`.
- **Calidad**: sin tests, typecheck ni script de build; `src/stories/` es boilerplate sin usar.

### Hoja de ruta sugerida
1. Exportar la API pública en `index.ts` y verificar el build de la librería.
2. Integrar Formik + Yup en los inputs y eliminar los errores hardcodeados.
3. Crear el contenedor `ArtisanForm` que lea `scheme`, renderice el paso actual y calcule `isFinalStep`.
4. Corregir `DynamicSelect` y agregar tests mínimos y scripts de typecheck/build.

## Flujo de trabajo

Resumen (detalle en [AGENTS.md](AGENTS.md)):

- `master` es estable y `develop` es de integración; no se commitea directo a ninguna.
- Una feature = una rama = un PR, partiendo de `develop`:
  - `feat/AF<n>-slug`, `fix/AF<n>-slug`, `chore/slug`.
  - `AF<n>` es el número del issue.
- Los PR van a `develop` usando el [template](.github/PULL_REQUEST_TEMPLATE.md). `develop` → `master` solo en releases.
- Commits: `tipo: :emoji: descripción` (ej. `feat: :sparkles: add Text input`).
- Antes del PR: `pnpm lint` limpio y story actualizada.

### Historial de features
| Rama | Contenido | Estado |
| --- | --- | --- |
| `feat/AF1-create-control-component` | Store, `cn` y `Controls` | Mergeada (PR #1) |
| `feat/AF2-add-inputs` | Inputs + stories + Prettier | En curso |

## Convenciones de código

- Prettier: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 columnas, LF.
- Un componente por carpeta, `export default`, con su story al lado.
- Inputs con `forwardRef`, props tipadas con `interface`, accesibilidad básica (`label htmlFor`, `aria-*` en errores).
- Estilos solo con Tailwind + `cn()`.
- Estado global solo en `useArtisanStore`.
- UI en español; código, commits e identificadores en inglés.

## Contribuir

1. Abrí un issue con el template correspondiente.
2. Creá la rama desde `develop` con el nombre `feat/AF<n>-slug`.
3. Implementá, agregá/actualizá la story, corré `pnpm format` y `pnpm lint`.
4. Abrí el PR hacia `develop` completando el template.
