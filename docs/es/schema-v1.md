# ArtisanSchema v1

> 🌐 Versión en español de [schema-v1.md](../schema-v1.md) (el original, en inglés, es la referencia).

Contrato público, serializable y versionado para definir formularios de ArtisanForm. Esta es la **Fase 1**: estabiliza el contrato y deja la compatibilidad con 0.2.0 resuelta por un adaptador. El motor (React Hook Form + Yup + Zustand) y la UI no cambian.

> **Cómo leer este documento.** Cada capacidad está marcada: ✅ **Implementado**, 🔁 **Compatible por adaptador** (0.2.0 sigue funcionando y se traduce) o ⏳ **Pendiente** (diseñado/reservado, **no** implementado).

## 1. Objetivos

- Un único contrato **JSON serializable** y **TypeScript-first**, con dos modos que convergen en el mismo runtime: escribirlo en código (`defineForm`) o recibirlo de una API (`parseArtisanSchema`).
- Campos y pasos **discriminados por `type`**; condiciones **declarativas** (sin ejecutar código); extensiones por **registro** (ids), no por funciones embebidas.
- **Versionado** del esquema y de los borradores; ids estables de formulario y de paso.
- Un contrato que **no depende** de Formik, React Hook Form, Yup ni Zustand (lo verifican un test y una regla de Biome sobre `src/schema/**` y `src/persistence/**`).

## 2. Estructura

```ts
interface ArtisanSchemaV1 {
  schemaVersion: 1;      // formato; otras versiones se rechazan
  id: string;            // identifica el formulario (los borradores quedan atados a él)
  revision?: number;     // revisión de esta definición (los borradores la registran)
  title?: string;
  description?: string;
  ui?: FormUIConfig;
  steps: ArtisanStepV1[];
}
```

| Capa | Dónde | Estado |
| --- | --- | --- |
| Contrato público (tipos) | `src/schema/contract/{types,fields,steps,define}.ts` | ✅ |
| Tablas por tipo (propiedades permitidas) | `src/schema/contract/specs.ts` | ✅ |
| Condiciones (evaluador puro) | `src/schema/contract/conditions.ts` | ✅ |
| Parser / validación estructural | `src/schema/parser.ts` | ✅ |
| Normalización + adaptador 0.2.0 | `src/schema/{normalize.ts,legacy/adapter.ts}` | ✅ / 🔁 |
| Proyección al motor | `src/engine/project.ts` | ✅ |
| Snapshots de borradores | `src/persistence/` | ✅ |

## 3. Pasos y campos

Todo paso tiene `id` (obligatorio, único), `title` y `type`. Opcionales comunes: `visibleWhen`, `ui: { columns: 1 | 2 }`, `controls`, `hooks: { beforeNext?, onEnter? }` (**ids** de funciones, ver §9).

| `type` de paso | Propiedades propias | 0.2.0 |
| --- | --- | --- |
| `form` | `fields` | `kind` ausente o `form` |
| `payment` | `providers` (ids), `resultName?`, `summary?` (texto) | `provider`/`providers` |
| `wait` | `strategy` (id), `message?`, `resultName?`, `failTo?` (id de paso) | `kind: 'pending'` |
| `terms` | `content?` (texto), `href?`, `accept?: { name?, label? }` | `acceptName`/`acceptLabel` |
| `review` | — | igual |
| `result` | `message?`, `errorMessage?`, `actions?: { label, href?, action? }[]` | `actions[].onClick` → `action` (id) |
| `custom` | `renderer` (id), `config?` | `render` (función) |
| `x-…` | `config?` | otros `kind` registrados con `stepTypes` |

Los campos comparten `FieldBase` (`name`, `id?`, `label?`, `description?`, `required?`, `disabled?`, `defaultValue?`, `visibleWhen?`, `ui?`). Las propiedades frecuentes quedan en el campo (`name`, `type`, `label`, `required`, `disabled`, `defaultValue`, `placeholder`); las reglas avanzadas van en `validation` y la presentación en `ui`.

| Familia | `type` | Propiedades propias |
| --- | --- | --- |
| Texto | `text` `email` `tel` `url` `password` `textarea` | `placeholder`, `mask`, `prefix`, `suffix`, `autoComplete`, `inputMode`, `readOnly`, `maxLength`, `validation: { minLength, maxLength, pattern, sameAs }` |
| Número | `number` | `placeholder`, `prefix`, `suffix`, `step`, `validation: { min, max }` |
| | `range` / `rating` / `otp` | `step` + `validation` / `length` / `length`, `charset` |
| Fecha | `date` `time` `datetime` `month` | `placeholder`, `validation: { min, max }` (cadenas ISO) |
| | `daterange` | + `endName`, `endLabel` (**produce dos valores**) |
| Elección | `select` `radio` `check` | `options` (obligatorio) |
| | `combobox` `multiselect` | `placeholder`, `options` y/o `optionsSource` (id) |
| | `dynamicSelect` | `options`, `dependentName`, `dependentOptions` o `dependentOptionsSource` (id) (**dos valores**) |
| Booleano | `checkbox` `switch` | — |
| Archivos | `file` `image` | `accept`, `storage`, `capture`, `validation: { maxSize, minFiles, maxFiles }` |
| Repetible | `array` | `itemFields`, `addLabel`, `validation: { minItems, maxItems }` |
| Contenido | `heading` `paragraph` `callout` `divider` | `text`, `variant` (no guardan valor) |
| Propio | `x-…` | `config` (JSON) |

Un campo con una propiedad que su tipo no admite es un **error** del parser (`unknown-property`), no se ignora.

### Transiciones, bucles y revisitar ✅

Opcionales en cada paso; un schema que no usa ninguna navega exactamente como antes (siguiente paso visible, Atrás retrocede un paso).

```jsonc
{ "id": "plan", "type": "form", "title": "Plan", "fields": [ … ],
  "next": [ { "when": { "field": "plan", "operator": "eq", "value": "pro" }, "to": "pay" },
            { "to": "review" } ] }
```

- **`next: { when?, to }[]`**: cuando el paso valida, la primera arista cuyo `when` se cumple (siempre, si se omite) decide adónde ir; `to` es un id de paso. Sin coincidencia, un destino oculto o un destino `result` vuelve al siguiente paso visible.
- **`loop: { max }`**: obligatorio en el destino de una arista que vuelve atrás (o a sí mismo). Es cuántas veces el paso puede **reingresarse** (la primera visita no cuenta); agotado, la arista se omite.
- **`revisit: 'allow' | 'deny'`** (por defecto `allow`): `deny` significa que, una vez terminado el paso, el usuario no puede volver a él y Atrás se detiene justo después (un paso pagado no se deshace). El stepper y `goToStep` rechazan saltos que lo crucen.
- **Atrás** sigue el camino realmente recorrido (un historial de pasos terminados, guardado en el borrador como `history?` del snapshot; `snapshotVersion` sigue en 1), no el orden de los pasos.
- **Parser:** una arista a un id desconocido es `unknown-step-reference`; volver a un paso sin `loop` es `unbounded-loop` (error); un paso que ningún camino alcanza es `unreachable-step` (aviso); `loop.max` debe ser un entero de 1 a 1000.
- **Límites:** el último paso visible que no es `result` sigue enviando (las ramas deberían reconverger, o ocultar pasos con `visibleWhen`); sin ramas paralelas ni sub-flujos.

## 4. Condiciones declarativas ✅

```json
{ "all": [
  { "field": "age", "operator": "lt", "value": 18 },
  { "not": { "field": "parent", "operator": "eq", "value": true } }
] }
```

Operadores: `eq neq gt gte lt lte in notIn filled empty`; combinadores `all any not`. Sin `eval`, sin `new Function`, sin callbacks. Reglas (probadas en `src/schema/__tests__/conditions.test.ts`):

| Caso | Regla |
| --- | --- |
| Campo inexistente | se lee como `undefined` |
| `eq` / `neq` | **estrictos**: `5 ≠ "5"`, `null ≠ undefined`; arrays por igualdad profunda |
| `gt gte lt lte` | solo número↔número o texto↔texto; tipos distintos ⇒ `false` |
| `in` / `notIn` | `value` debe ser un array; si el valor del campo es un array, "intersecta" |
| `filled` | ni `undefined`, `null`, `''` ni un array sin elementos llenos (`0` y `false` **sí** están llenos) |
| `all([])` / `any([])` | `true` / `false` |
| `coerce: "string"` | opt-in: compara como texto y lee `null`/`undefined` como `''`. Lo usa el adaptador para reproducir `showIf` |

El parser rechaza referencias a campos que no existen (`unknown-field-reference`) y condiciones anidadas a más de 32 niveles. Pueden referirse a campos de pasos posteriores, a los nombres que producen `dynamicSelect`/`daterange` y a los valores que guardan `payment`, `wait.resultName` y `terms`.

**Visibilidad (sin cambios respecto de 0.2.0).** Un campo oculto no se renderiza, **no se valida** y **no se envía**; un paso oculto se saltea y sus campos tampoco se validan ni se envían. El valor se conserva en el estado, así que reaparece si la condición vuelve a cumplirse.

⏳ Condiciones sobre campos **dentro de filas** de `array`: no soportadas (error explícito).

## 5. Configuración visual ✅ (contrato) / ⏳ (interpretación)

```ts
FormUIConfig  { layout?: 'vertical' | 'horizontal'; density?: 'compact' | 'comfortable'; labelPosition?: 'top' | 'left' }
StepUIConfig  { columns?: 1 | 2 }
FieldUIConfig { span?: 1 | 2; variant?: string }
```

Valores semánticos: sin CSS ni clases Tailwind en el contrato. El renderer por defecto interpreta **`columns`, `span`, `density` y `labelPosition`** (y expone `layout` como gancho de estilo `data-layout`); `variant` solo se entrega a componentes propios (`field.uiVariant`). Ver [ui.md](ui.md).

`width: 'half' | 'full'` (0.2.0) ⇒ `ui.span: 1 | 2`. `helperText` ⇒ `description`.

## 6. Uso desde TypeScript ✅

```ts
import { ArtisanForm, defineForm } from 'artisanform';

const registration = defineForm({
  schemaVersion: 1,
  id: 'registration',
  revision: 1,
  steps: [
    {
      id: 'account',
      type: 'form',
      title: 'Cuenta',
      fields: [
        { name: 'email', type: 'email', label: 'Correo', required: true, placeholder: 'nombre@empresa.com', validation: { maxLength: 255 }, ui: { span: 2 } },
        { name: 'kind', type: 'radio', label: 'Tipo', options: [{ value: 'person', label: 'Persona' }, { value: 'company', label: 'Empresa' }] },
        { name: 'company', type: 'text', label: 'Empresa', required: true, visibleWhen: { field: 'kind', operator: 'eq', value: 'company' } },
      ],
    },
    { id: 'done', type: 'result', title: 'Listo', message: 'Gracias' },
  ],
});

<ArtisanForm scheme={registration} onSubmit={save} persistKey="registration" />;
```

`defineForm` es una **función identidad**: da autocompletado y comprueba el literal contra el contrato, y devuelve el mismo objeto (lo que escribís es exactamente lo que se puede serializar). Los tipos rechazan en compilación, por ejemplo, `options` en un `text`, funciones en el esquema o `array` dentro de `array`.

## 7. Uso desde JSON remoto ✅

```ts
import { ArtisanForm, parseArtisanSchema, type SchemaPolicy } from 'artisanform';

const policy: SchemaPolicy = {
  hooks: ['checkName'],
  waitStrategies: ['orderStatus'],
  paymentProviders: ['stripe'],
  optionsSources: ['countries'],
};

const result = parseArtisanSchema(await (await fetch('/api/forms/registration')).json(), { policy });
if (!result.success) {
  console.error(result.issues); // [{ severity, code, path, message }]
  return;
}

<ArtisanForm scheme={result.schema} extensions={extensions} onSubmit={save} />;
```

Un esquema remoto **no es de confianza solo por ser JSON válido**: con `policy`, toda referencia a algo local (tipos `x-…`, hooks, estrategias de espera, renderers, acciones, proveedores de pago, fuentes de opciones) debe estar en la lista. Lo que no figura, no se permite (`policy-violation`). Sin `policy` (modo `trusted`, el de los esquemas escritos en código) se acepta cualquier id.

## 8. Validación estructural ✅

`parseArtisanSchema(input: unknown, { policy? })` → `{ success: true, schema, issues }` | `{ success: false, issues }`. Es **manual y sin dependencias** (no usa AJV: AJV compila validadores con `new Function`, lo que choca con el principio de no ejecutar código dinámico y con CSP estrictas). Comprueba: objeto JSON válido y serializable, `schemaVersion`, obligatorios, discriminadores, propiedades desconocidas, ids de paso y nombres duplicados, condiciones y sus referencias, `failTo`, patrones (`RegExp` válidos, ≤ 500 caracteres) y la política. Cada `SchemaIssue` trae `code` estable y una `path` legible (`steps[1].fields[0].type`). Devuelve **el mismo objeto** que recibió (no lo copia ni lo muta).

Códigos frecuentes: `missing-version`, `unsupported-version` (versiones futuras), `unknown-type`, `unknown-property`, `duplicate-id`, `duplicate-name`, `unknown-field-reference`, `unknown-step-reference`, `not-serializable`, `policy-violation`, `invalid-pattern`, `unsupported-in-array`, `unsafe-url`, `invalid-name`.

Dos reglas protegen los schemas que vienen de una fuente no confiable (un CMS, un backend): un `href` (paso `terms`, `actions` del resultado) debe ser `http:`, `https:`, `mailto:` o una referencia relativa, o da `unsafe-url`; y un nombre de campo no puede ser `__proto__`, `constructor` ni `prototype`, ni contener `.`, `[` o `]`, o da `invalid-name`. El render también omite un `href` inseguro, lo que cubre los schemas 0.2.0.

Esto valida **la definición**. La validación de **los valores** que escribe el usuario sigue siendo Yup (sin cambios).

## 9. Extensibilidad ✅

El esquema solo nombra; lo ejecutable vive en registros locales:

| Pieza | En el esquema | Se registra en |
| --- | --- | --- |
| Tipo de campo propio | `type: "x-stars"`, `config` | prop `fields` (`FieldDefinition`) |
| Tipo de paso propio | `type: "x-fancy"`, `config` | prop `stepTypes` (`StepDefinition`) |
| Opciones asíncronas | `optionsSource` / `dependentOptionsSource` | `extensions.options` / `extensions.dependentOptions` |
| Estrategia de espera | `strategy` | `extensions.waits` |
| Hooks de paso | `hooks.beforeNext` / `hooks.onEnter` | `extensions.hooks` |
| Renderer de paso | `renderer` | `extensions.renderers` |
| Acciones del resultado | `actions[].action` | `extensions.actions` |
| Pagos / almacenamiento | `providers` / `storage` | props `plugins` / `storage` (sin cambios) |

Una referencia sin registrar **falla de forma explícita** (`ArtisanSchemaError`, `unresolved-reference`), no se ignora. Los nombres propios deben empezar con `x-` para no chocar nunca con un tipo nativo futuro; un tipo 0.2.0 sin prefijo (`stars`) y su equivalente v1 (`x-stars`) resuelven a la misma entrada del registro.

⏳ **Limitación:** `optionsSource` solo existe en `combobox`/`multiselect` (y `dependentOptionsSource` en `dynamicSelect`): es donde el motor sabe cargar opciones asíncronas. `select`/`radio`/`check` requieren `options` inline.

## 10. Versionado ✅

- `schemaVersion: 1` identifica el formato. Un número mayor se rechaza (`unsupported-version`) en lugar de interpretarse mal. Un esquema **sin** `schemaVersion` se trata como 0.2.0 en `normalizeArtisanSchema`.
- `id` identifica el formulario y `revision` una definición concreta; ambos se registran en los borradores.
- Las migraciones automáticas de datos están ⏳ fuera de alcance: se detecta la incompatibilidad y decide el consumidor (§11).

## 11. Persistencia ✅

Con `persistKey`, el borrador se guarda en `localStorage['artisanform:<persistKey>']` como:

```ts
interface ArtisanSnapshotV1 {
  snapshotVersion: 1;
  formId: string;          // ArtisanSchemaV1.id
  formRevision?: number;
  currentStepId: string;   // por id, no por índice
  values: Record<string, JSONValue>;
}
```

- **Secretos**: nunca se guardan (contraseñas y cualquier campo marcado secreto, también dentro de filas de `array`); se conservan las protecciones previas de `withoutSecrets`.
- **Archivos**: solo como los descriptores serializables que devolvió el adaptador (`{ id, name, size, type?, url? }`); nunca `File`. Cualquier valor que no sea JSON se descarta al guardar.
- **Borradores 0.2.0** (`{ values, step }`): se restauran y se reescriben como snapshot al siguiente guardado. En 0.2.0 `step` era el índice entre los pasos **visibles**; se convierte a `stepId` evaluando la visibilidad con los valores guardados. Un borrador 0.2.0 no conoce `formId`: adopta el del formulario en ejecución.
- **Incompatibilidades** (`form-id`, `revision`, `step-missing`, `unsupported-version`, `corrupt`): el borrador **nunca se borra en silencio**. `onSnapshotConflict(conflict) → 'backup' | 'restore' | 'discard'`; por defecto `backup`: se mueve a `artisanform:<key>:incompatible` (una sola ranura) y el formulario arranca limpio. `restore` aplica los valores igualmente (empezando por el primer paso si el paso ya no existe); `discard` lo elimina. Si falta la revisión en alguno de los lados, no se considera un conflicto.
- **Atención con formularios 0.2.0:** sus ids de paso se derivan del título, así que **renombrar o reordenar títulos hace que un borrador ya guardado no encuentre su paso** (`step-missing`) y, con la política por defecto, se respalde y el formulario arranque limpio. En 0.2.0 el borrador se restauraba por índice y sobrevivía a un cambio de título. Pasá a `ArtisanSchemaV1` con ids explícitos, o usá `onSnapshotConflict={() => 'restore'}` para conservar los valores (se empieza en el primer paso).
- Si el paso guardado existe pero hoy está oculto, se restauran los valores y se empieza en el primer paso visible.

## 12. Compatibilidad con 0.2.0 🔁

`scheme` acepta `FormSchema` (0.2.0) **o** `ArtisanSchemaV1`; ambos pasan por la misma tubería:

```
FormSchema (0.2.0) ─► adaptador (legacy/adapter.ts) ─┐
                                              ├─► NormalizedArtisanSchema ─► proyección ─► motor actual
ArtisanSchemaV1 ───► parser + defaults ───────┘
```

No hay dos motores ni ramas de compatibilidad en los componentes. `FormSchema`, `FieldSchema` y `StepSchema` quedan **`@deprecated`** pero no se elimina nada (props `scheme`, `persistKey`, `initialValues`, `onSubmit`, `onChange`, `onStepChange`, `step`, registros, plugins, storage y estrategias de espera siguen igual).

| 0.2.0 | v1 |
| --- | --- |
| `kind` | `type` (`pending` → `wait`; sin `kind` → `form`; otros → `x-<kind>`) |
| `showIf { field, equals, not }` | `visibleWhen`: `equals` → `in` con `coerce: "string"`; sin `equals` → `filled`; `not` → `{ not }` |
| `width` | `ui.span` (`half` → 1, `full` → 2) |
| `helperText` | `description` |
| `label` en `heading`/`paragraph`/`callout` | `text` |
| `min`/`max` | texto → `validation.minLength/maxLength`; `number`/`range` → `validation.min/max` |
| `pattern`, `sameAs` | `validation.pattern`, `validation.sameAs` |
| `minDate`/`maxDate` | `validation.min/max` |
| `minItems`/`maxItems` | `validation.minItems/maxItems` |
| `minFiles`/`maxFiles`/`maxSize` | `validation.*` |
| `loadOptions` / `loadDependentOptions` | `optionsSource` / `dependentOptionsSource` (función → *binding*) |
| `beforeNext` / `onEnter` / `render` / `wait` / `actions[].onClick` | `hooks.*` / `renderer` / `strategy` / `actions[].action` (función → *binding*) |
| Tipo de campo propio (`stars`) | `x-stars`, extras bajo `config` |

**Bindings.** Las funciones y el contenido que no es JSON (JSX en `content`/`summary`) no pueden vivir en el esquema: el adaptador los **extrae** a un mapa de bindings con ids sintéticos (`legacy:<stepId>:beforeNext`) y el esquema las referencia por id. `normalizeArtisanSchema(...)` devuelve `{ schema, bindings, portable, source, issues }`; `portable` es `true` solo si no hizo falta ningún binding y no se descartó nada, es decir, solo entonces el esquema se puede mandar como JSON y reconstruir en otro lado. El adaptador **nunca lanza**: lo que no se pudo representar queda como *warning* (`extracted-binding`, `unknown-legacy-property`, `ignored-legacy-property`, `duplicate-name`…).

**Ids de paso derivados.** `slug(title)` (con tildes plegadas), `-2`, `-3`… ante colisiones, `<type>-<posición>` si el título no da nada. Son deterministas (sin aleatorios ni fechas) pero **cambian si se reordenan o renombran pasos**: en v1 el `id` explícito es obligatorio justamente por eso.

**Diferencias deliberadas.** `failTo` (índice en 0.2.0) se convierte a id y se queda como id: el wizard lo resuelve contra los pasos **visibles** cuando la espera falla (si ese paso está oculto, el botón retrocede un paso). En v1 un `name` duplicado es un error; en 0.2.0 sigue permitido y solo avisa. Un `terms` con `fields` propios no es representable en v1 (se descartan con aviso; rige el checkbox por defecto). Las condiciones `showIf` dentro de filas de `array` nunca se aplicaron y se descartan con aviso.

## 13. Limitaciones actuales

- La UI por defecto no aplica estilo propio a `layout: 'horizontal'` (solo el gancho `data-layout`) ni usa `variant` (⏳).
- Sin anidamiento arbitrario: las filas de `array` son planas (sin `array` anidado, contenido, tipos `x-…` ni `visibleWhen`).
- `optionsSource` solo en `combobox`/`multiselect`.
- Los `hooks` y `onSnapshotConflict` de un esquema 0.2.0 siguen siendo código TypeScript, no datos.
- Los mensajes de validación y textos de interfaz siguen saliendo de `labels` (no del esquema).
- Los snapshots no tienen migraciones automáticas; un único respaldo por clave.

## 14. Reservado para fases futuras ⏳

Migrar Yup → otro validador (la costura es `project.ts` + `FieldDefinition.rules`: el contrato y `src/schema` no cambian), sistemas de diseño propios que interpreten `ui`, constructor visual, motor *headless*, formularios versionados desde un backend con migraciones, anidamiento de campos repetibles y condiciones dentro de filas.
