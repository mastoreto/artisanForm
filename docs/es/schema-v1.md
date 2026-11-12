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
| `wait` | `strategy` (id), `message?`, `resultName?`, `failTo?` (id de paso), `timeoutMs?`, `retry?: { max, backoffMs? }`, `cancellable?` | `kind: 'pending'` (las mismas tres opciones) |
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
| Elección | `select` `radio` | `options` u `optionsSource` (id), no ambos |
| | `check` | `options` (obligatorio) |
| | `combobox` `multiselect` | `placeholder`, `options` y/o `optionsSource` (id) |
| | `dynamicSelect` | `options`, `dependentName`, `dependentOptions` o `dependentOptionsSource` (id) (**dos valores**) |
| Booleano | `checkbox` `switch` | — |
| Archivos | `file` `image` | `accept`, `storage`, `capture`, `validation: { maxSize, minFiles, maxFiles }` |
| Repetible | `array` | `itemFields`, `addLabel`, `validation: { minItems, maxItems }` |
| Contenido | `heading` `paragraph` `callout` `divider` | `text`, `variant` (no guardan valor) |
| Propio | `x-…` | `config` (JSON) |

Un campo con una propiedad que su tipo no admite es un **error** del parser (`unknown-property`), no se ignora.

### Espera: timeout, reintento y cancelar ✅

En un paso `wait` (o un paso `pending` 0.2.0): `timeoutMs` hace fallar el paso si sigue pendiente pasado ese tiempo (mensaje `labels.waitTimeout`); `retry: { max, backoffMs? }` reintenta solo después de un fallo (demora `backoffMs × n`, 1000 ms por defecto, `max` de 1 a 10) antes de que el usuario lo vea, y el Reintentar del usuario reinicia la cuenta; `cancellable: true` muestra un botón Cancelar (`labels.cancel`) que aborta la espera y va adonde va `failTo`. Valen para cualquier estrategia, además de lo que la estrategia haga por su cuenta (`polling` tiene su propio `timeout`).

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

Códigos frecuentes: `missing-version`, `unsupported-version` (versiones futuras), `unknown-type`, `unknown-property`, `duplicate-id`, `duplicate-name`, `unknown-field-reference`, `unknown-step-reference`, `not-serializable`, `policy-violation`, `invalid-pattern`, `unsupported-in-array`, `unsafe-url`, `invalid-name`, `conflicting-properties`.

Dos reglas protegen los schemas que vienen de una fuente no confiable (un CMS, un backend): un `href` (paso `terms`, `actions` del resultado) debe ser `http:`, `https:`, `mailto:` o una referencia relativa, o da `unsafe-url`; y un nombre de campo no puede ser `__proto__`, `constructor` ni `prototype`, ni contener `.`, `[` o `]`, o da `invalid-name`. El render también omite un `href` inseguro, lo que cubre los schemas 0.2.0.

Esto valida **la definición**. En el navegador, los **valores** que escribe el usuario los valida Yup (sin cambios); en un servidor, usa `validateValues` (abajo).

### Validar los valores en un servidor ✅

`validateValues` revisa los **valores** que envió un cliente contra el mismo schema, sin React, Yup ni el motor del formulario. Se exporta desde `artisanform/schema`, una entrada que no importa ninguno de ellos (un chequeo del build falla si alguna vez lo hace), así que corre en Node, en un worker o en cualquier runtime de JS.

```ts
import { parseArtisanSchema, validateValues } from 'artisanform/schema';

const parsed = parseArtisanSchema(storedJson, { policy });          // una vez, al recibirlo o guardarlo
const result = validateValues(parsed.schema, submitted, {
  prune: true,                                   // devuelve además los valores sin campos ocultos ni claves desconocidas
  dynamicOptions: { countries: ['ar', 'uy'] },   // las opciones de cada optionsSource que quieras comprobar
});
if (!result.ok) return reply(400, result.issues); // [{ path: 'jobs[0].role', code: 'required', params? }]
save(result.values);
```

Los problemas llevan un `code` y `params`, nunca un mensaje: los formatea la UI. Códigos: `required`, `type`, `tooLong`, `minLength`, `maxLength`, `pattern`, `unsafePattern`, `mustMatch`, `invalidEmail`, `invalidUrl`, `invalidPhone`, `invalidNumber`, `minValue`, `maxValue`, `invalidDate`, `minDate`, `maxDate`, `endBeforeStart`, `invalidOption`, `invalidLength`, `invalidCharset`, `outOfRange`, `minItems`, `maxItems`, `minFiles`, `maxFiles`, `invalidFile`, `fileTooLarge`, `fileType`, `custom`.

Sigue las mismas reglas que el formulario: un campo o paso oculto no se valida ni se devuelve, el paso `terms` necesita su checkbox, y las reglas compartidas (longitudes, `pattern`, `sameAs`, límites de números y fechas, cantidades de filas y archivos) dan el mismo resultado. **Es deliberadamente más estricto que el navegador**, porque un servidor no debe confiar en el cliente. Las diferencias, cada una fijada por un test:

- **Tipos.** Un número debe ser número (`"5"` es `invalidNumber`), un texto un string, un checkbox un booleano, una lista un array.
- **Valores ausentes.** Una clave que falta se informa. El navegador siempre parte de valores iniciales (la primera opción de un select, `false`, `[]`), así que nunca los ve ausentes.
- **Opciones.** Los valores de `select`, `radio`, `check`, `multiselect`, `combobox` y `dynamicSelect` deben estar entre las opciones (`invalidOption`). Para un `optionsSource` solo se comprueba si pasas sus opciones en `dynamicOptions`.
- **OTP y rating.** Un OTP debe tener exactamente `length` caracteres de su `charset`; un rating debe ser un entero de 1 a `length`.
- **Fechas** deben ser días reales del calendario (`2026-02-31` es `invalidDate`).
- **Archivos.** Cada entrada debe ser un descriptor (`id`, `name`, `size`); se aplican `maxSize` y `accept`.
- **Límites.** Un texto más largo que `maxStringLength` (10 000 por defecto) es `tooLong`, y un `pattern` con cuantificadores anidados (`(a+)+`) es `unsafePattern`: el patrón de un schema es entrada no confiable en un servidor y no se ejecuta si puede explotar. Los patrones compilados se cachean.
- **URLs** necesitan esquema (`http`, `https` o `ftp`).

Los tipos de campo personalizados `x-*` no se validan salvo que pases una regla para ellos en `customTypes`.

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

`optionsSource` existe en `combobox`, `multiselect`, `select` y `radio` (y `dependentOptionsSource` en `dynamicSelect`). En `select` y `radio` reemplaza a `options` (no ambos) y la fuente se llama con una consulta vacía para obtener todas las opciones; el campo muestra un estado de carga y uno de error como `dynamicSelect`. ⏳ **Limitación:** `check` sigue requiriendo `options` en línea.

### Capacidades: qué puede ejecutar un front ✅

Un schema solo nombra hooks, estrategias de espera, renderers, acciones, fuentes de opciones, proveedores de pago, adaptadores de storage y tipos personalizados; el código vive en la app que lo renderiza. Cuando los schemas vienen de una API, la API necesita saber **al publicar un schema** si el front desplegado puede ejecutarlo, en vez de enterarse como un `unresolved-reference` al renderizar. Tres funciones puras en `artisanform/schema` (sin React, así que una API Node las puede usar) lo cubren:

```ts
import { checkCapabilities, collectReferences, describeCapabilities } from 'artisanform/schema';

// En el build o el CI del front: qué puede ejecutar esta app. Un manifiesto JSON plano.
const manifest = describeCapabilities({
  extensions,                              // el objeto que pasas a <ArtisanForm extensions>
  paymentProviders: ['stripe', 'mp'],      // ids de plugins.payments
  storage: ['docs'],                       // claves de los adaptadores de storage
  fieldTypes: ['x-stars'],                 // tipos de campo personalizados (la prop `fields`)
});                                        // súbelo a tu API

// En la API, al publicar una revisión (o en el front, antes de renderizar un schema recién pedido):
const issues = checkCapabilities(schema, manifest);   // [] significa "puede ejecutarlo"
const requires = collectReferences(schema);           // guárdalo con la revisión
```

`checkCapabilities` devuelve `missing-reference` (con el `kind`, el `id` y el `path` del schema), `unsupported-field-type`, `unsupported-step-kind`, `missing-feature` y `unsupported-contract`. Los **features** son comportamientos opcionales de los que puede depender un schema (`transitions`, `wait-options`, `options-source-choice`): un front construido con una librería más vieja no los tiene, así que un schema escrito para una más nueva se rechaza en vez de comportarse mal. El manifiesto lleva un id de `contract` (`artisanform.capabilities/1`) y es JSON plano, así que se puede guardar y comparar después. Los requisitos se derivan del schema, por lo que el contrato en sí no cambió.

Para que un formulario siga funcionando cuando falta un nombre opcional, pasa `onUnresolved` a `<ArtisanForm>`: se llama por cada referencia que ningún registro provee, y devolver `'ignore'` renderiza sin ella (un hook opcional no corre, las opciones de una fuente quedan vacías). Cualquier otro valor mantiene el fallo, así que el comportamiento por defecto no cambia. Ignora solo lo opcional: una estrategia de espera o un renderer ausentes dejan a su paso sin nada que hacer.

### Traducciones ✅

El schema se escribe en un **idioma fuente** (inglés por defecto) y no se toca. Un **catálogo** asocia rutas de texto estables con el texto traducido; el formulario lo aplica sobre el texto fuente, así que los valores escritos, los nombres de campo y todos los ids son los mismos en cualquier idioma.

```text
title · description
steps.<stepId>.title | summary | message | errorMessage | content
steps.<stepId>.controls.nextLabel | previousLabel
steps.<stepId>.accept.label · steps.<stepId>.actions.<índice>.label
steps.<stepId>.fields.<name>.label | description | placeholder | prefix | suffix | endLabel | addLabel | text
steps.<stepId>.fields.<name>.options.<value>
steps.<stepId>.fields.<name>.dependentOptions.<padre>.<value>
steps.<stepId>.fields.<name>.fields.<hijo>.label   (filas de un array)
labels.<clave>                                      (los textos propios de la librería, ver `ArtisanLabels`)
```

Un valor es un string o formas plurales `{ one, other, … }` (`other` es obligatoria; en las funciones de `labels.*` la forma sigue al primer argumento numérico mediante `Intl.PluralRules`). La librería rellena los `{nombre}` (`labels.step`: `"Paso {n} de {total}: {title}"`). Renombrar un id deja huérfanas sus traducciones: `validateCatalog` lo informa.

Tres formas de aportar catálogos, con el mismo formato; por cada etiqueta de la cadena (`es-AR` → `es`) gana el primero que la tenga:

```tsx
<ArtisanForm scheme={scheme} locale="es-AR"
  messages={{ es }}                                      // 1. una prop
  loadMessages={(l) => import(`./catalogs/${l}.json`)}   // 2. bajo demanda, por idioma
/>
// 3. dentro del schema: { "i18n": { "sourceLocale": "en", "messages": { "es": { ... } } } }
```

Los formularios pequeños pueden llevar sus catálogos en el bloque opcional `i18n`; los grandes cargan solo el idioma en uso con `loadMessages` (devuelve el catálogo o un módulo con `default`). Mientras un catálogo carga, o si falla, se ve el texto fuente: una traducción ausente nunca rompe un formulario y cambiar `locale` no reinicia lo que el usuario escribió. La librería solo trae inglés; el resto lo aportas tú.

Los textos propios de la librería siguen **valores por defecto < `labels` del kit < `labels.*` del catálogo < la prop `labels`**. Las incidencias de `validateValues` en el servidor se convierten en mensajes del mismo idioma con `formatIssue(issue, labels)`.

Utilidades puras en `artisanform/schema` (sin React) para el flujo de publicación de una API: `extractMessages(schema)` (la plantilla en inglés a traducir), `validateCatalog(schema, catalog)` → `{ missing, orphan, badPlaceholders }`, `applyCatalog(schema, [catálogos])` (una copia traducida, p. ej. para servir un idioma), `resolveLocaleChain('es-AR')` → `['es-AR', 'es']`, `format` y `placeholdersOf`.

Fuera de alcance: diseños de derecha a izquierda, el formato de `<input type="date">` (lo decide el navegador) y los textos `ReactNode` del 0.2.0.

## 10. Versionado ✅

- `schemaVersion: 1` identifica el formato. Un número mayor se rechaza (`unsupported-version`) en lugar de interpretarse mal. Un esquema **sin** `schemaVersion` se trata como 0.2.0 en `normalizeArtisanSchema`.
- `id` identifica el formulario y `revision` una definición concreta; ambos se registran en los borradores.
- Las migraciones de datos son opt-in (`snapshotMigrations`, §11): sin ellas se detecta la incompatibilidad y decide el consumidor.

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
- **Dónde y cuándo se escribe:** `draftStorage` (cualquier cosa con `getItem`/`setItem`/`removeItem`, síncrona: `sessionStorage`, uno en memoria o propio; por defecto `localStorage`) y `draftDebounceMs` (por defecto 0 = en cada cambio; con una demora también escribe al cambiar de paso o al desmontar, y nunca después de un envío exitoso).
- **Migraciones:** `snapshotMigrations={{ 1: (s) => ({ ...s, formRevision: 2, values: { ...s.values, fullName: s.values.name } }) }}` lleva un borrador guardado con la revisión 1 a la `revision` del formulario. Cada migración recibe una copia del snapshot en la revisión *n* y lo devuelve en una revisión mayor; la cadena corre hasta que la revisión coincide. Si falta una migración, lanza, devuelve algo que no es un snapshot o no sube la revisión, el borrador pasa por `onSnapshotConflict` como antes. Tras una migración exitosa el original queda en el slot de respaldo. `migrateSnapshot` se exporta para probarlas.
- **Helpers de IO** (exportados): `readSnapshot`, `writeSnapshot`, `clearSnapshot`, `readRaw`, `backupStored`, `createSnapshot`, `parseStored`, `checkSnapshot`, `migrateSnapshot`.

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
- `optionsSource` no en `check`.
- Los `hooks` y `onSnapshotConflict` de un esquema 0.2.0 siguen siendo código TypeScript, no datos.
- Los mensajes de validación y textos de interfaz siguen saliendo de `labels` (no del esquema).
- Un único respaldo por clave; el storage debe ser síncrono (todavía no hay borradores asíncronos).

## 14. Reservado para fases futuras ⏳

Migrar Yup → otro validador (la costura es `project.ts` + `FieldDefinition.rules`: el contrato y `src/schema` no cambian), sistemas de diseño propios que interpreten `ui`, constructor visual, motor *headless*, formularios versionados desde un backend con migraciones, anidamiento de campos repetibles y condiciones dentro de filas.
