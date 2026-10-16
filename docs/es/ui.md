# Arquitectura de UI y personalización

> 🌐 Versión en inglés: [../ui.md](../ui.md)

El esquema dice **qué** es el formulario, el motor decide **cómo se comporta** y el renderer decide **cómo se ve**. Esta guía cubre el renderer: cómo reestilizar la UI por defecto, reemplazar cualquier parte y enchufar otras librerías de UI, sin tocar el motor.

## Capas

| Capa | Posee | Nunca posee |
| --- | --- | --- |
| Esquema (`ArtisanSchemaV1`) | pasos, campos, condiciones, reglas de validación, `ui` semántico | componentes, CSS |
| Motor (`src/engine`, `useWizard`) | valores, validación, navegación, borradores, operaciones asíncronas | colores, layout |
| Renderer (`Wizard`, registros de pasos y campos) | qué componente muestra qué, grilla, errores, progreso | validación, navegación |
| Componentes de UI (`src/components/inputs`, `ui`, `Controls`, `Stepper`…) | markup y estilos | estado del formulario |

`useWizard` (interno, `src/components/ArtisanForm/useWizard.ts`) contiene todo el comportamiento del wizard y `Wizard` solo dibuja lo que devuelve. Todavía **no** se publica una API headless (`useArtisanForm`); ver [Pendiente](#pendiente).

## Tres niveles de personalización

Usá uno o combinalos; todos funcionan con cualquier enfoque de CSS (CSS plano, SCSS, Less, CSS Modules, CSS-in-JS, Tailwind).

1. **Tokens**: cambiá el aspecto de la UI por defecto con variables CSS.
2. **`classNames` / `unstyled`**: sumá tus clases a cada parte, o quitá las clases de la librería.
3. **`components`**: reemplazá partes completas (inputs por tipo de campo, Stepper, Controls…).

### 1. Estilos por defecto y tokens

`import 'artisanform/style.css'` carga CSS plano (sin Tailwind y sin reset sobre tu app). Cada regla es una sola clase `.af-*`; el estado viene de atributos `data-*`/`aria-*`. Tematizalo con variables (todas tienen fallback):

```css
:root {
  --artisan-primary: #7c3aed;
  --artisan-primary-dark: #5b21b6;
  --artisan-radius: 0.75rem;
  --artisan-border: #c4b5fd;
  --artisan-error: #be123c;
  --artisan-text: #1f2937;
  --artisan-muted: #6b7280;
  --artisan-subtle: #f3f4f6;
  --artisan-surface: #fff;
  --artisan-gap: 1rem;
  --artisan-font: inherit;
}
```

### 2. `classNames` y `unstyled`

```tsx
// Tailwind (o cualquier CSS): tus clases se suman a las de por defecto
<ArtisanForm scheme={scheme} onSubmit={save}
  classNames={{ input: 'rounded-full border-emerald-400', button: 'bg-emerald-600' }} />

// Desde cero: sin clases `af-*`, solo las tuyas
<ArtisanForm scheme={scheme} onSubmit={save} unstyled
  classNames={{ input: 'my-input', label: 'my-label', controls: 'my-controls', button: 'my-button' }} />
```

Slots (`ARTISAN_SLOTS`): `root`, `stepper`, `stepperList`, `stepperItem`, `stepHeader`, `fieldGrid`, `fieldCell`, `field`, `label`, `groupLabel`, `description`, `error`, `input`, `inputWrap`, `adornment`, `select`, `selectWrap`, `selectIcon`, `choiceGroup`, `choice`, `switch`, `switchThumb`, `checkbox`, `chipList`, `chip`, `comboWrap`, `listbox`, `option`, `optionHint`, `otpGroup`, `otpBox`, `rating`, `star`, `range`, `rangeValue`, `dropzone`, `fileList`, `fileItem`, `fileName`, `fileThumb`, `progress`, `progressBar`, `link`, `smallButton`, `arrayList`, `arrayItem`, `arrayItemHeader`, `arrayItemTitle`, `arrayRow`, `controls`, `button`, `action`, `formError`, `status`, `statusIcon`, `statusTitle`, `statusMessage`, `statusActions`, `spinner`, `callout`, `heading`, `paragraph`, `divider`, `review`, `reviewList`, `reviewRow`, `terms`, `stack`, `dependent`, `dateRange`, `text`, `muted`, `srOnly`. Cada una se dibuja como `af-<kebab-case>`; la clase `srOnly` siempre se conserva (el texto para lectores de pantalla debe seguir oculto).

Especificidad: los selectores de la librería son clases simples, así que ganan a los resets de elementos (p. ej. el preflight de Tailwind) y tu propia clase los pisa si se carga después o es más específica.

### 3. `components`

```tsx
<ArtisanForm
  scheme={scheme}
  onSubmit={save}
  components={{
    inputs: { text: MyText, select: MySelect },   // por `type` de campo
    FieldWrapper: MyField,                         // label + descripción + error alrededor de cada campo
    Stepper: MyStepper,
    Controls: MyControls,
    StepHeader: MyStepHeader,                      // opcional
    FormError: MyFormError,                        // opcional
  }}
/>
```

Todo es opcional y cae a la UI por defecto. `components` es una prop (código local): un esquema JSON nunca puede traer un componente.

#### Contrato de input: `ArtisanInputProps<TValue>`

Un input de reemplazo nunca ve React Hook Form ni Zustand:

| Prop | Significado |
| --- | --- |
| `id`, `name` | identidad del campo (`id` = `name`) |
| `value`, `onChange(value)`, `onBlur()` | valor controlado, ya normalizado |
| `disabled`, `readOnly`, `required` | desde el esquema |
| `label`, `description`, `placeholder`, `options` | desde el esquema |
| `error` | `{ code, message }` cuando el campo fue tocado (o se intentó "Siguiente") y es inválido; `code` es la regla que falló (`required`, `min`, `typeError`…) |
| `aria` | `{ 'aria-invalid', 'aria-describedby' }`: aplicalo al control |
| `descriptionId`, `errorId` | ids para tus elementos de descripción / error |
| `field` | la definición del campo, solo lectura (extras como `mask`, `min`, `uiVariant`) |

Tipos de `value` según `type`: `text/email/tel/url/password/textarea/date/time/datetime/month/select/radio/combobox/otp` → `string`; `number/range/rating` → `number | string`; `checkbox/switch` → `boolean`; `check/multiselect` → `string[]`.

No se reemplazan con `components.inputs` (varios valores o estado propio): `array`, `file`/`image`, `dynamicSelect`, `daterange`. Esos se proveen con el registro `fields`.

#### Props de los componentes

- `FieldWrapper`: `{ id, label, description?, error?, invalid, className?, children }`. Al proveerlo, los inputs por defecto omiten su propio label/descripción/error, y un input de reemplazo debería dibujar solo el control.
- `Stepper`: `{ steps: { id, title, state: 'done' | 'current' | 'upcoming' }[], current, labels }`. La navegación la maneja el motor: un stepper muestra el progreso, no salta entre pasos.
- `Controls`: `{ onNext, onPrevious, isFirst, isLast, isSubmitting, nextDisabled?, hidePrevious?, hideNext?, error, labels }`. `onNext` valida, corre `beforeNext` y avanza (o envía en el último paso).
- `StepHeader`: `{ title, index, total }`. `FormError`: `{ message }`.

#### Responsabilidades de accesibilidad

La UI por defecto asocia labels, pone `aria-invalid`/`aria-describedby`, anuncia el cambio de paso y mueve el foco al primer campo inválido. Un reemplazo lo mantiene:

- dándole al control `id` y un `<label htmlFor={id}>` (o dejando que lo haga un `FieldWrapper`),
- aplicando `aria` al control (`aria-invalid` también es cómo el foco encuentra el primer campo inválido),
- dibujando `description` / `error` con `descriptionId` / `errorId` (errores con `role="alert"` o `aria-live`),
- exponiendo el progreso en un `Stepper` propio (por ejemplo `aria-current="step"`).

## Ajustes semánticos de `ui`

El `ui` del esquema lo interpreta el renderer por defecto y nunca contiene CSS:

| Dónde | Ajuste | Efecto |
| --- | --- | --- |
| formulario | `density: 'compact' \| 'comfortable'` | `data-density` en la raíz; compact reduce el espaciado |
| formulario | `labelPosition: 'top' \| 'left'` | `data-label-position`; `left` pone los labels en una columna junto al control |
| formulario | `layout: 'vertical' \| 'horizontal'` | `data-layout` en la raíz (gancho de estilo; todavía sin regla propia) |
| paso | `columns: 1 \| 2` | columnas de la grilla (1 columna en pantallas chicas igual) |
| campo | `span: 1 \| 2` | columnas que ocupa en un paso de 2 (el `width: 'half'` heredado ⇒ `span: 1`) |
| campo | `variant: string` | no lo usa la UI por defecto; llega a un componente propio como `field.uiVariant` |

La grilla colapsa a una columna en pantallas angostas sin configurar nada en el esquema.

## Campos y pasos propios

Los tipos que la librería no trae se registran localmente y se nombran desde el esquema (JSON incluido):

```tsx
const fields: FieldRegistry = {
  satisfaction: {                          // esquema: { "type": "x-satisfaction", ... }
    initialValues: (f) => ({ [f.name]: '' }),
    rules: () => ({}),                      // reglas Yup por nombre de valor
    render: (f, ctx) => <MyRating name={f.name} label={f.label} />,
    // secret?: true  → nunca se escribe en borradores
  },
};
<ArtisanForm scheme={json} fields={fields} />
```

Una entrada sin `render`, `initialValues` o `rules` lanza error al montar, con el nombre del tipo. Un `type` desconocido muestra una alerta visible en lugar de romper.

Los pasos propios usan `stepTypes` y la `api` estable del contexto del paso (`ArtisanStepApi`):

| `api` | |
| --- | --- |
| `step` | `{ id, title, kind, index, total }` |
| `values` | valores actuales (solo lectura) |
| `setValue(name, value)` | solo nombres que el paso posee (sus campos y `resultName`); cualquier otro lanza error |
| `errors` | mensajes de validación de los campos del paso |
| `next()`, `back()` | navegación por las reglas del motor (validación, `beforeNext`, envío en el último paso) |
| `submitState`, `submitError`, `error`, `labels` | estado |

El resto de `StepContext` (`goTo`, `submit`, los datos derivados del store) sigue por compatibilidad pero se salta la validación: preferí `api` en código nuevo. `useArtisanStore` es un detalle interno, no un contrato estable.

## Compatibilidad

- `<ArtisanForm scheme onSubmit />` funciona igual; `components`, `classNames` y `unstyled` son opcionales.
- Esquemas 0.2.0 y v1, registros de campos y pasos, inputs exportados y `Controls`, callbacks, validación, borradores, pagos, storage y esperas no cambian.
- La hoja de estilos por defecto ahora es CSS plano (sin clases de Tailwind ni reset global). Si dependías de que `artisanform/style.css` trajera el preflight de Tailwind, agregá tu propio reset.
- `cn()` ahora es un wrapper fino de `clsx` (sin `tailwind-merge`).

## Pendiente

- **API headless.** `useWizard` ya contiene todo el comportamiento; falta una forma pública estable. Propuesta para la próxima fase: `useArtisanForm({ scheme, onSubmit, ... })` que devuelva `{ steps, step, fields, values, errors, next, back, submitState }`, con `fields` portando los mismos `ArtisanInputProps` de `components.inputs`. No se exporta porque congelaría decisiones del motor (React Hook Form, Zustand, borradores) una fase después de que cambiaron.
- `layout: 'horizontal'` no tiene estilo propio (solo el gancho `data-layout`).
- Un stepper no puede navegar a pasos anteriores; eso requiere una noción de "visitado y válido" en el motor.
