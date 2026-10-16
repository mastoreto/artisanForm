# ArtisanForm

Librería React para construir formularios multi-paso (wizard) a partir de una definición (`scheme`). Incluye inputs prediseñados con Tailwind, validación con Formik + Yup y el estado de los pasos en Zustand. Se desarrolla y documenta con Storybook.

> **Estado:** funcional y empaquetable (ES + CJS, estilos incluidos). Aún no publicada en ningún registro. Ver [Estado del proyecto](#estado-del-proyecto).

## Stack

| Área                     | Tecnología                                  |
| ------------------------ | ------------------------------------------- |
| UI                       | React 18, TypeScript (strict)               |
| Estilos                  | Tailwind CSS 3, `clsx` + `tailwind-merge`   |
| Estado de pasos          | Zustand 5                                   |
| Formularios y validación | Formik 2 + Yup                              |
| Documentación            | Storybook 8 (`@storybook/react-vite`)       |
| Build                    | Vite 5 en modo librería + `vite-plugin-dts` |
| Tests                    | `bun test`                                  |
| Formato                  | Prettier 3                                  |
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
| `pnpm lint` / `pnpm format` | Prettier check / write                               |
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

| Tipo          | Campos                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `FormSchema`  | `steps: StepSchema[]`                                                                                           |
| `StepSchema`  | `title`, `fields: FieldSchema[]`                                                                                |
| `FieldSchema` | `type`, `name`, `label`, `placeholder?`, `options?`, `required?`, `min?`, `dependentName?`, `dependentOptions?` |

Tipos de campo (`type`): `text`, `password`, `date`, `select`, `dynamicSelect`, `check`, `radio`.

- `required` → obligatorio (en `check`, al menos una opción). `min` → largo mínimo de texto.
- `dynamicSelect` guarda dos valores: `name` (primer select) y `dependentName` (segundo), cuyas opciones salen de `dependentOptions[valorDelPrimero]`.

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

## Instalación

`react`, `react-dom`, `formik`, `yup` y `zustand` son `peerDependencies`:

```bash
pnpm add artisanform react react-dom formik yup zustand
```

## API pública (`src/index.ts`)

`ArtisanForm`, `Controls`, `TextInput`, `Password`, `DateInput`, `Select`, `DynamicSelect`, `Check`, `Radio`, `useArtisanStore`, `cn` y los tipos `FormSchema`, `StepSchema`, `FieldSchema`.

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
└── vite.config.ts · tailwind.config.js · tsconfig.json · .prettierrc
```

## Estado del proyecto

### Hecho

- Store de pasos, `Controls` y 7 inputs integrados con Formik/Yup.
- Contenedor `ArtisanForm` dirigido por `scheme`, con validación por paso.
- `DynamicSelect` con opciones dependientes configurables.
- API exportada y build de la librería (ES + UMD + tipos).
- Stories de cada componente y tests de `buildSchema`.

### Hoja de ruta

Cada tarea es un issue de GitHub (`AF<n>` en el título) y una rama desde `develop`. Orden recomendado: AF8 → AF11 → AF10 → AF9 → AF12 → AF13/14 → AF15–17 → AF21.

| Etapa                 | Tareas                                                                                                                                                                                                                                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Hacerla consumible | [AF8](https://github.com/mastoreto/artisanForm/issues/2) CI · [AF9](https://github.com/mastoreto/artisanForm/issues/3) distribución del CSS · [AF10](https://github.com/mastoreto/artisanForm/issues/4) peer deps y `exports` · [AF11](https://github.com/mastoreto/artisanForm/issues/5) tests del flujo |
| 2. Núcleo             | [AF12](https://github.com/mastoreto/artisanForm/issues/6) estado por instancia · [AF13](https://github.com/mastoreto/artisanForm/issues/7) más validaciones en el scheme · [AF14](https://github.com/mastoreto/artisanForm/issues/8) API de `ArtisanForm`                                                 |
| 3. Experiencia        | [AF15](https://github.com/mastoreto/artisanForm/issues/9) accesibilidad y stepper · [AF16](https://github.com/mastoreto/artisanForm/issues/10) textos configurables · [AF17](https://github.com/mastoreto/artisanForm/issues/11) theming                                                                  |
| 4. Avanzado           | [AF18](https://github.com/mastoreto/artisanForm/issues/12) condicionales · [AF19](https://github.com/mastoreto/artisanForm/issues/13) opciones async · [AF20](https://github.com/mastoreto/artisanForm/issues/14) borrador                                                                                |
| 5. Release            | [AF21](https://github.com/mastoreto/artisanForm/issues/15) versión 0.1.0                                                                                                                                                                                                                                  |

### Brechas conocidas

- El flujo en navegador no está verificado automáticamente (solo hay tests de `buildSchema`).
- Scheme limitado a pasos lineales y validaciones `required`/`min`; textos fijos en español.

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

- Prettier: 2 espacios, comillas simples, `;`, trailing comma `all`, 80 columnas, LF.
- Un componente por carpeta con su `*.stories.tsx`; `export default`.
- Inputs con `forwardRef` cuando exponen un elemento, `useField` de Formik y accesibilidad básica (`label htmlFor`, `aria-invalid`, `aria-describedby`).
- Estilos solo con Tailwind + `cn()`. Estado global solo en `useArtisanStore`.
- UI en español; código, commits e identificadores en inglés.
