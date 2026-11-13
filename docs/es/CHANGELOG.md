# Changelog

> 🌐 Versión en español de [CHANGELOG.md](../../CHANGELOG.md).

## Unreleased

### Agregado

- **La interfaz del builder.** `<FormBuilder>` es una paleta de inputs, un canvas con los pasos y sus campos, un inspector y una vista previa en vivo, y entrega un schema v1 en cada cambio (`onChange({ schema, ok, issues })`, `onSave({ …, hash })`). Arrastrá un input desde la paleta (o hacé clic) y reordená con el mouse, el tacto o el teclado (Espacio para levantar, flechas, Espacio para soltar); cada fila también tiene botones para subir, bajar, duplicar, quitar y mover a otro paso. El inspector se genera desde el catálogo, así cada input muestra solo lo que su tipo acepta; `mode="simple"` oculta inputs y ajustes avanzados y de desarrollador, y `policy` limita los inputs disponibles. La vista previa es el `<ArtisanForm>` real (anchos de teléfono, tableta y escritorio, claro y oscuro). Controlado (`value`) o no (`defaultValue`), `readOnly`, `features` para apagar partes, y todos los textos se pueden cambiar con `labels`. Las partes (`Palette`, `Canvas`, `Inspector`, `Preview`, `Toolbar`) y el hook `useFormBuilder` se pueden componer en tu propio layout. Importá `artisanform/builder.css` (una hoja separada) y `artisanform/style.css`. El arrastre usa `@dnd-kit/core` y `@dnd-kit/sortable`, peers opcionales: instalalos para usar el builder.
- **Builder: problemas, compatibilidad y tipos custom.** Un panel desplegable lista cada error y aviso del schema (`checkSchema` en vivo, contra tu `manifest` o `registrations`, `policy` y `limits`) y cada uno salta al elemento al que se refiere. Con `baseline` (el schema publicado) el builder compara cada edición con él (`compareSchemas`) y avisa cuando un cambio dejaría ilegibles las respuestas anteriores (una pregunta que cambió de tipo), o cuando se quitaron preguntas, se volvieron obligatorias o perdieron opciones. Los tipos custom `x-…` registrados en el manifiesto aparecen en la paleta (limitados por `policy.fieldTypes`) y sus ajustes se generan desde el `ConfigShape` de su spec (números con su rango, enums como desplegables, interruptores, texto; un tipo sin spec recibe su config como JSON); un campo custom nuevo arranca con un config que ya cumple su spec. Nuevas funciones del modelo `addCustomField`, `customFieldProperties` y `defaultConfig`.
- **`artisanform/builder` (primera parte: el modelo).** La base de un constructor visual de formularios, sin React: operaciones inmutables sobre un schema v1 (`addField`, `removeField`, `moveField` entre pasos y hacia las filas de un `array`, `duplicateField`, `renameField`, lo mismo para pasos, y `setProperty` sobre una ruta con puntos), nombres e ids que se mantienen únicos (incluidos los implícitos como `${name}End` y `termsAccepted`), referencias que siguen a un renombrado o se podan al borrar, deshacer y rehacer con fusión de ráfagas de tipeo, y `pathToSelection` para saltar de la ruta de un issue al elemento. `FIELD_CATALOG` y `STEP_CATALOG` describen cada tipo nativo para una paleta, y `fieldProperties` / `stepProperties` listan las propiedades que edita un inspector. Un tipo nuevo de campo o de paso en el contrato es un error de compilación hasta que el catálogo y el inspector decidan cómo tratarlo, y un test falla si una clave del contrato queda sin cubrir. Las operaciones dejan siempre un schema válido: se probó con secuencias aleatorias de operaciones (con semilla) que deben pasar `checkSchema` después de cada paso. El entry es opcional: tiene su propio presupuesto de tamaño y no hace crecer el resto del paquete.

## 1.0.0-rc.4 (2026-11-13)

Reemplaza a `1.0.0-rc.3`, que se publicó con un build viejo (sin `artisanform/schema.json`, sin ninguna de las funciones nuevas de `artisanform/schema` y con un CLI que no podía ejecutarse). La rc.4 es el mismo código que la rc.3, construido correctamente; el contenido de la rc.3 está listado bajo su propio título. No uses la rc.3.

### Corregido

- Ya no se puede publicar a mano un build viejo: cada kit tiene un `prepublishOnly` que corre el chequeo previo (enlaces, frescura de `dist`, tipos), y la publicación manual documentada ya no se salta el `prepublishOnly` del núcleo.
- Se perdía el CLI `artisanform` al publicar: con `"bin": {"artisanform": "./bin/artisanform.mjs"}` npm 11 descarta la entrada ("script name … was invalid and removed"). Ahora la ruta es `bin/artisanform.mjs`, y `check:pack` falla cuando `npm publish --dry-run` corregiría algo de un `package.json`; `verify-registry` también comprueba que el paquete publicado tenga su `bin`.

### Agregado

- `scripts/verify-registry.mjs`: descarga los cinco paquetes de una versión desde npm y verifica sus archivos y que `artisanform/schema` declare todos los exports del snapshot de la API. El workflow `Release` lo corre después de una publicación real (reintentando mientras npm propaga).

## 1.0.0-rc.3 (2026-11-13)

Tercer release candidate: herramientas de backend. Agrega la marca `sensitive` en los campos (una adición al contrato), `checkSchema` y sus compañeras en `artisanform/schema`, un formulario que ya no lanza una excepción ante un schema que no puede ejecutar, `artisanform/schema.json`, el CLI `artisanform` y la [guía de backend](backend.md). Todo es aditivo salvo los cambios de comportamiento listados en "Cambiado".

### Cambiado

- **`<ArtisanForm>` ya no lanza una excepción ante un schema que no puede ejecutarse.** Antes, un schema inválido o un nombre que nadie registró lanzaba durante el render y, sin un error boundary en la app, dejaba la página en blanco. Ahora el formulario pasa el schema por la misma puerta que `checkSchema` y, si algo lo detiene, muestra un mensaje corto (`labels.schemaErrorMessage`, traducible; en desarrollo además lista cada error con su código y ruta, controlado por `showSchemaIssues`). Todo se informa por la nueva prop `onSchemaIssues(issues)`, errores y avisos por igual, una vez por cada conjunto distinto. Un `fallback` propio (nodo o función de los issues) reemplaza el mensaje. El hook headless `useArtisanWizard` devuelve `schemaIssues` y `schemaBlocked`. Un formulario bloqueado nunca lee ni toca un borrador guardado.
  - Lo que detiene el formulario (error): un schema inválido, un hook, wait strategy, renderer, acción o proveedor de pago ausente, un tipo de paso no registrado, un `config` inválido de un tipo custom. Un proveedor de pago ausente ahora se informa antes de que el usuario complete nada, no al llegar al paso de pago.
  - Lo que solo degrada (aviso): un origen de opciones ausente (el campo no muestra opciones; antes bloqueaba el formulario), un adaptador de storage ausente, un campo custom no registrado (muestra su propio aviso), hallazgos de lint, y todo lo que se encuentre en un schema 0.2.0, que nunca bloquea.
  - `normalizeArtisanSchema` sigue lanzando `ArtisanSchemaError` (es su contrato); solo el formulario dejó de lanzar.
- `Unknown field type` / `Unknown step kind` salen de `labels` (`unknownFieldType`, `unknownStepKind`) en lugar de estar fijos en inglés.
- Con un objeto `SchemaPolicy`, un id de `storage` que la política no lista ahora es un `policy-violation` (antes pasaba cualquier id). Agregá `storage: [...]` a la política para permitir los que proveés. Los schemas de confianza no cambian.

### Agregado

- **Ayudantes para backend en `artisanform/schema`:** `answerFields(schema)`, `answerKeys(field)` y `sensitiveAnswerKeys(schema)` listan las preguntas que hace un schema, las claves que escribe un campo (un rango de fechas y un select dinámico escriben dos) y las claves marcadas como sensibles. Funciones puras, sin React.
- **`sensitive?: boolean` en los campos:** una marca para respuestas personales o confidenciales. La librería solo la transporta; quién puede leer esas respuestas lo decide el backend.
- **`SchemaPolicy.nativeFieldTypes` / `nativeStepTypes`:** restringen qué tipos nativos de campo y de paso puede usar una fuente de schemas (las violaciones son `policy-violation`).
- **`SchemaPolicy.storage`:** los ids de adaptadores de storage que un campo `file`/`image` puede nombrar.
- **`ParseOptions.limits`** (`maxBytes`, `maxSteps`, `maxFields`, `maxOptions`): topes para schemas que vienen de afuera. Ninguno se aplica si no se define. Códigos: `too-large`, `too-many-steps`, `too-many-fields`, `too-many-options`.
- **Opción `maxItems` de `validateValues`** (por defecto 1000): tope para las filas de un `array`, las opciones de un `check`/`multiselect` y los archivos de una subida, comprobado antes de recorrer la lista.
- **`$schema`** se acepta como string opcional en la raíz de un schema (autocompletado en editores).

- **`checkSchema(input, { policy, limits, manifest, lint })`:** una puerta pura para un schema. Parsea (contrato, política, límites), aplica lint y comprueba el schema contra lo que el front puede ejecutar, y nunca lanza. Usala donde un schema entra o sale de un sistema: guardarlo o publicarlo en un backend, CI, o el formulario que está por renderizarlo. Errores y avisos comparten una forma de issue, y lo que impide que el formulario funcione (un hook, wait strategy, renderer, acción o proveedor de pago ausente, un `config` custom inválido) es un error, mientras que lo que solo degrada un elemento (un origen de opciones o adaptador de storage ausente, un campo custom no registrado) es un aviso (`capabilitySeverity`).
- **Tipos custom verificables:** `CustomTypeSpec` y `ConfigShape` (un subconjunto declarativo mínimo de JSON Schema) describen como datos el `config` de un campo o paso custom `x-…`. Viaja en el manifiesto de capacidades (`CapabilitiesManifest.customTypes`), así `checkCapabilities` informa `invalid-config` con la ruta exacta sin ejecutar el código de la app. `validateConfig` se exporta.
- **`describeRegistrations({ extensions, fields, stepTypes, plugins, storage })`:** deriva el manifiesto de capacidades de las mismas props que se pasan a `<ArtisanForm>`, en lugar de cuatro listas mantenidas a mano. `FieldDefinition` y `StepDefinition` aceptan un `spec` opcional.
- **`lintSchema(schema)`:** avisos semánticos (`forward-field-reference`, `default-not-an-option`, `duplicate-option`).
- **`canonicalize(value)` y `schemaHash(value)`:** texto JSON estable (claves ordenadas) y su SHA-256 (hex): un ETag, la identidad de una revisión, detección de cambios.
- **`compareSchemas(previous, next)`:** qué cambió entre dos revisiones (agregadas, quitadas, tipo cambiado, obligatoriedad, opciones eliminadas) y si las respuestas dadas a la anterior conservan su significado (`compatible`).
- **`artisanform/schema.json`:** el JSON Schema (draft 2020-12) del contrato v1, construido con las listas de claves de la propia librería. Describe la estructura (tipos, claves conocidas, enums, propiedades obligatorias), así cualquier lenguaje, o una base de datos que valide JSON, puede comprobar un schema sin Node. Usalo desde el `$schema` de un schema para el autocompletado del editor. No reemplaza a `parseArtisanSchema` / `checkSchema`: nombres e ids únicos, referencias entre campos y pasos, el flujo, la política, los límites y las capacidades necesitan el documento completo. La paridad con el parser se prueba con cada fixture golden.
- **Guía de backend** ([docs/es/backend.md](backend.md)): el flujo de guardar, publicar, servir y recibir con `checkSchema`, `compareSchemas`, `schemaHash` y `validateValues`; modelos de almacenamiento (un documento JSON por revisión, una tabla de proyección de campos, la normalización total y cuándo evitarla); el tipo de columna, el chequeo de validez y los límites para PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite y MongoDB; y una guía para autores de plugins y tipos custom (`spec`, `describeRegistrations`, qué bloquea un formulario y qué solo avisa).
- **CLI `artisanform`** (`npx artisanform`): `validate <archivos…>` ejecuta `checkSchema` (opciones `--policy`, `--manifest`, `--max-bytes`, `--max-steps`, `--max-fields`, `--max-options`, `--no-lint`, `--json`; salida 0 ok, 1 schema inválido, 2 uso incorrecto), `json-schema` imprime el schema del contrato y `hash <archivo>` imprime el SHA-256 de su JSON canónico. Para CI, hooks de pre-commit y backends en cualquier lenguaje.

## 1.0.0-rc.2 (2026-11-13)

Segundo release candidate: corrige la compatibilidad con Next.js. El contrato v1 y la API pública (`check:api`) no cambian respecto de `1.0.0-rc.1`.

### Corregido

- **Next.js App Router:** `artisanform`, `artisanform/headless` y `artisanform/payments/*` ahora traen la directiva `'use client'`. Sin ella, importar la librería desde un Server Component rompía el build (`Export FormProvider doesn't exist in target module`), porque `react-hook-form` resolvía a su versión de servidor sin hooks. `artisanform/schema` no tiene la directiva y sigue siendo usable en el servidor.
- **TypeScript 6:** `import 'artisanform/style.css'` ahora tiene declaración de tipos (`exports["./style.css"].types`). Sin ella, la verificación estricta de imports con efectos secundarios fallaba en apps que no aportan tipos para `*.css` (Next 15).

### Agregado

- `scripts/consumer-next.mjs` (`bun run check:next`) y un job de CI `consumers-next`: una app Next 15 y 16 limpia con ambos routers; verifica build, SSR, hidratación, una server action y `validateValues` en el servidor.

## 1.0.0-rc.1 (2026-11-12)

Primer release candidate de la 1.0.0. El contrato del schema v1, la API pública de `artisanform` y `artisanform/schema`, el contrato de capacidades y el formato de catálogos quedan congelados con las reglas de [versionado](versioning.md): hasta la 1.0.0 solo entran correcciones. Las secciones siguientes (todas `1.0.0-rc.1`) son lo que cambió desde la 0.3.0-beta.2: validación en el servidor y `artisanform/schema`, capacidades, traducciones, gates de rendimiento y congelación del contrato. Probala con `npm install artisanform@rc`.

## 1.0.0-rc.1 (Congelación del contrato)

### Calidad

- **Política de versionado y guardias del contrato (AF119):** [versionado](versioning.md) define qué puede cambiar en una menor de 1.x y qué exige una mayor, sobre tres superficies (el contrato del schema, la API de TypeScript de `artisanform` y `artisanform/schema`, el contrato de capacidades y el formato de catálogos). Lo hacen cumplir los fixtures golden (`src/schema/__tests__/fixtures-v1/`: los 13 ejemplos del catálogo deben parsear limpios, normalizar al JSON registrado y ser idempotentes y portables; los casos inválidos mantienen sus códigos y rutas) y `bun run check:api`, que compara cada export y declaración de ambas entradas con `api/*.api.txt` (CI, release y `prepublishOnly`). Sin cambios de comportamiento.

## 1.0.0-rc.1 (Rendimiento)

### Calidad

- **Rendimiento medido contra el estándar de Web Vitals (AF118):** `bun run perf` (Playwright, build de producción del playground) verifica "formulario listo", latencia de interacción, tareas largas y cambio de diseño en Chromium (escritorio y un perfil móvil con la CPU 4x más lenta), Firefox y WebKit, más una línea base por navegador (`perf/web-baseline.json`, +50%). `bun run check:size` limita el JS, el CSS y `artisanform/schema` comprimidos a +10% sobre `perf/size.json`. Nuevo job de CI `perf`. Los presupuestos y su base están en [rendimiento](performance.md). El pipeline del schema cuesta unos 1,2 ms con 200 campos, así que no se cambió código de la librería.
- Nuevo escenario `perf` del playground (`?demo=perf&fields=50&perStep=50`) y scripts `playground:build` / `playground:preview`; `perf/generate.mjs` acepta un argumento `perStep`.

## 1.0.0-rc.1 (Traducciones)

### Back end y front end

- **Catálogos de traducción (AF117):** el schema se queda en su idioma fuente y un catálogo asocia rutas de texto estables (`steps.<id>.fields.<name>.label`, `…options.<value>`, …) con el texto traducido, con formas plurales y `{placeholders}`. `<ArtisanForm locale messages loadMessages>` lo aplica (`es-AR` cae a `es` y luego al texto fuente); un schema también puede llevar catálogos pequeños en un bloque opcional `i18n`. Cambiar `locale` no reinicia los valores escritos, un catálogo ausente o que falla nunca rompe el formulario y `loadMessages` carga solo el idioma en uso. Solo se incluye inglés. `artisanform/schema` suma las utilidades puras `extractMessages`, `validateCatalog`, `applyCatalog`, `resolveLocaleChain`, `format` y `placeholdersOf`. Ver [schema v1](schema-v1.md#traducciones-).
- **Los textos propios de la librería son traducibles (AF117):** las entradas `labels.<clave>` de un catálogo traducen `ArtisanLabels`, incluidas las etiquetas función (`{n}`, formas plurales). Precedencia: valores por defecto < labels del kit < catálogo < la prop `labels`. `ArtisanForm` ahora pasa los labels del kit al wizard por separado (opción `kitLabels` de `useArtisanWizard`), de modo que un kit en inglés no pisa un catálogo. Sin `locale` el resultado no cambia.
- **`formatIssue(issue, labels)` (AF117):** convierte una incidencia de `validateValues` en el mismo mensaje que muestra el navegador, en el idioma de `labels`.

## 1.0.0-rc.1 (Capacidades y enrutamiento del retorno de pagos)

### Back end y front end

- **Contrato de capacidades (AF115):** `collectReferences`, `describeCapabilities` y `checkCapabilities` en `artisanform/schema` (puras, sin React). Un front describe lo que registró como un manifiesto JSON (`artisanform.capabilities/1`); una API revisa un schema contra él al publicar una revisión y obtiene `missing-reference` (kind, id, ruta en el schema), `unsupported-field-type`, `unsupported-step-kind`, `missing-feature` o `unsupported-contract`, en vez de un `unresolved-reference` al renderizar. Los requisitos se derivan del schema (`collectReferences`), así que el contrato del schema no cambió. Ver [schema v1](schema-v1.md#capacidades-qué-puede-ejecutar-un-front-).
- **`onUnresolved` (AF115):** `<ArtisanForm onUnresolved>` se llama por cada nombre que el schema usa y que ningún registro provee; devolver `'ignore'` renderiza sin él. Cualquier otro valor mantiene el fallo, así que el comportamiento por defecto no cambia.

### Personalización

- **Selector de métodos de pago (AF115):** cada método es una tarjeta con su logo, su nombre y una línea que dice si el usuario se queda en la página o es redirigido. `PaymentPlugin` y cada plugin incluido aceptan `icon` y `description`; Stripe, PayPal, Mercado Pago y Lemon Squeezy traen su marca (Simple Icons, CC0). Nuevos labels `payHintEmbedded` y `payHintRedirect`, nuevos slots de clases (`paymentOptions`, `paymentOption`, `paymentOptionIcon`, `paymentOptionText`, `paymentOptionName`, `paymentOptionHint`) y clases en los kits de Bootstrap y Tailwind.

### Correcciones

- **Un retorno de redirección iba al primer plugin que podía leerlo (AF115):** dos plugins de un mismo proveedor que comparten parámetros de retorno (el formulario embebido de Stripe y Checkout, el Brick de Mercado Pago y Checkout Pro) podían registrar el pago bajo el proveedor equivocado. El paso de pago ahora recuerda, por pestaña, qué plugin envió al usuario fuera y le pregunta primero a ese. Sin cambios en el contrato de los plugins ni en las URL de retorno.

### Documentación

- Una checklist del sandbox de Mercado Pago (vendedor y comprador de prueba, moneda, `auto_return` solo con https) en la guía de pagos. `apps/payments-test` ahora usa un solo puerto (5858) y tiene tests de servidor que fijan el cuerpo de la preferencia de Checkout Pro.
- **`apps/payments-test`: causa de "Una de las partes con la que intentas hacer el pago es de prueba" en Checkout Pro (AF115):** el backend de la demo enviaba `MP_PAYER_EMAIL` (una dirección común que necesita el Payment Brick) como `payer` de la preferencia, así que un vendedor de prueba quedaba emparejado con un pagador que no es comprador de prueba. Checkout Pro ahora envía un pagador solo desde la nueva `MP_CHECKOUT_PAYER_EMAIL` (el correo del propio comprador de prueba), y la variante H de `mp-diagnose.ts` reproduce la petición anterior.

## 1.0.0-rc.1 (Validación en servidor)

### Validación y empaquetado

- **`validateValues` y `artisanform/schema` (AF112):** un validador de **los valores enviados** que no necesita React, Yup ni el motor del formulario, para backends que guardan o actúan sobre los envíos. Devuelve los problemas como `{ path, code, params }` (sin mensajes), sigue las reglas de visibilidad del motor y da el mismo resultado que el navegador en las reglas compartidas, y es **más estricto donde un servidor no debe confiar en el cliente** (tipos, pertenencia a opciones, valores ausentes, límites de OTP y rating, fechas reales, metadatos de archivos, esquema de las URL, un tope de longitud y una guarda contra `pattern` catastróficos). Las diferencias están listadas en [schema v1](schema-v1.md#validar-los-valores-en-un-servidor-) y cada una está fijada por un test; fixtures JSON compartidos corren contra este validador y contra Yup. Se exporta desde la nueva entrada **`artisanform/schema`**, que no importa React, Yup, React Hook Form ni Zustand: `check:dist` sigue sus imports y falla ante cualquier especificador suelto, y un consumidor de CI sin ninguno de ellos instalados la importa y compila los tipos con `NodeNext`. La entrada raíz sigue reexportando todo.
- **`optionsSource` en `select` y `radio` (AF112):** sus opciones pueden venir de una fuente registrada en `extensions.options` (llamada con una consulta vacía), exclusiva con `options` en línea (`conflicting-properties`). El campo muestra un estado de carga y uno de error, y un select arranca en su primera opción una vez cargado, como uno estático. Los kits reciben las opciones ya resueltas. `check` sigue necesitando opciones en línea.
- **Notas de comportamiento:** la validación propia del formulario en el navegador no cambia. `SourcedChoiceFieldV1` es un miembro nuevo de `NativeFieldV1`; el código que reducía `select`/`radio` a `ChoiceFieldV1` ahora ve `options` como posiblemente ausente.

## 0.3.0-beta.2 (2026-11-12)

Republicación de 0.3.0-beta.1 con el empaquetado corregido. **No uses los kits de 0.3.0-beta.1; usá esta versión.** La librería núcleo no tiene cambios de código.

### Correcciones

- **Tipos de los kits (`@beardartisans/ui-bootstrap`, `ui-mui`, `ui-tailwind`):** el `.d.ts` publicado en 0.3.0-beta.1 exportaba `ArtisanUiKit` sin importarlo, así que `tsc` fallaba en cualquier proyecto que instalara los kits (`Cannot find name 'ArtisanUiKit'`). Los kits se construyeron en una máquina donde `artisanform` no se resolvía dentro de `packages/*`; los builds de CI estaban bien. Ver la nota en [releasing](releasing.md).
- **`@beardartisans/ui-tailwind`:** 0.3.0-beta.1 incluía el código de 0.3.0-beta.0; este es el primer release con las novedades de los kits listadas en 0.3.0-beta.1 (todas las partes con estilo, nuevo aspecto).
- **`@beardartisans/ui-bootstrap`:** 0.3.0-beta.1 no traía `dist/style.css`, así que `@beardartisans/ui-bootstrap/style.css` no se resolvía; restaurado.

## 0.3.0-beta.1 (2026-11-10)

Segunda beta. Destacados: la API headless pública (`useArtisanWizard`, `artisanform/headless`), valores de formulario tipados (`InferValues`), transiciones declarativas con bucles acotados y reglas de revisita, timeout/reintento/cancelación en `wait`, borradores conectables y migrables, un tema oscuro y un slot `StatusPanel`, y la URL de retorno de pagos como no confiable en el núcleo. **Cambios de comportamiento a leer antes de actualizar:** los pagos por redirección informan `processing`, nunca `succeeded` (AF78, AF86), y `parseArtisanSchema` rechaza valores `href` inseguros y nombres de campo peligrosos (AF76).

### Persistencia

- **Borradores conectables, debounce y migraciones (AF92):** `draftStorage` (cualquier store síncrono con `getItem`/`setItem`/`removeItem`), `draftDebounceMs` (también se escribe al cambiar de paso y al desmontar, nunca después de un envío exitoso) y `snapshotMigrations` (una cadena de funciones que llevan un borrador guardado con una `revision` anterior a la actual; los fallos caen en `onSnapshotConflict` y el original queda en el slot de respaldo). Los helpers de IO (`readSnapshot`, `writeSnapshot`, `clearSnapshot`, `readRaw`, `backupStored`) y `migrateSnapshot` se exportan. No incluido: storage asíncrono.

### Espera

- **Opciones de `wait` (AF91, decisión: sin paso `action` aparte):** `timeoutMs`, `retry: { max, backoffMs? }` y `cancellable` en pasos `wait` (y en pasos `pending` 0.2.0). Nuevos textos por defecto `waitTimeout` y `cancel`. El parser las valida (`timeoutMs` 1–3 600 000, `retry.max` 1–10, `backoffMs` 0–60 000).

### Workflows

- **Transiciones (AF90):** los pasos aceptan `next: { when?, to }[]` (la primera arista que coincide decide el siguiente paso), `loop: { max }` (acota los reingresos; obligatorio en el destino de un camino de vuelta) y `revisit: 'allow' | 'deny'` (a un paso `deny` terminado no se puede volver). Atrás sigue el camino recorrido; el camino se guarda en el borrador (`history?` en el snapshot, `snapshotVersion` sigue en 1) para que una recarga retome la rama. El parser informa `unbounded-loop` (error) y `unreachable-step` (aviso). Los schemas sin estas propiedades se comportan exactamente igual. `useArtisanWizard` agrega `canGoBack` y protege `goTo`/`goToStep` con la regla de revisitar. Ver [schema v1](schema-v1.md#transiciones-bucles-y-revisitar-).

### Personalización

- **`components.StatusPanel` (AF89):** la pantalla de los pasos de pago, espera y resultado se puede reemplazar (`ArtisanStatusPanelProps`).
- **Navegación del stepper:** `<ArtisanForm stepperNavigation>` hace clicables los pasos terminados (`ArtisanStepperProps.onSelect`; desactivado por defecto).
- **Tema, movimiento, foco:** `theme="dark" | "auto"` redefine los tokens de color (opt-in; sin él nada cambia), `prefers-reduced-motion` apaga las transiciones y más partes interactivas muestran un contorno `:focus-visible`. Nuevo slot de clase `stepperButton`.
- **No incluido:** el estilo de `layout: 'horizontal'` y un contrato uniforme para inputs multivalor (`array`, `file`, `dynamicSelect`, `daterange`) siguen pendientes.

### Valores tipados y navegación por id

- **`InferValues` y `onSubmit` tipado (AF88):** `defineForm` ahora conserva el tipo literal del schema (un genérico `const`; devuelve el mismo objeto) y `InferValues<typeof schema>` calcula los valores enviados a partir de él. `ArtisanForm` y `useArtisanWizard` son genéricos sobre el schema y tipan `onSubmit` con él; un schema que no es literal (o un `FormSchema` 0.2.0) sigue recibiendo `Record<string, unknown>`.
- **Navegación por id:** `wizard.goToStep(id)`, las opciones `stepId` / `onStepIdChange` y `ArtisanStepApi.goToStep(id)`. La API por índice no cambia. Las props tipadas de los pasos custom (`StepDefinition<P>`) no forman parte de este cambio.

### Headless

- **`useArtisanWizard` (AF87):** el comportamiento del wizard ahora es un hook público (ver [docs/es/headless.md](headless.md)), exportado desde `artisanform` y desde la nueva entrada `artisanform/headless` (sin hoja de estilos). Devuelve la instancia de React Hook Form, los pasos visibles, el paso actual, `next/back/goTo/submit`, el estado de envío y lo que necesita el renderer por defecto; `ArtisanWizardProvider` y `useArtisanField` enlazan tus inputs. `ArtisanForm` pasa a ser un consumidor fino de este hook y `Wizard` solo dibuja lo que devuelve. El `useArtisanForm` interno se renombró `useFormBinding`. `useWizard` recibe el formulario, el store y el estado de UI como parámetros en vez de leerlos del contexto. Sin cambios de comportamiento para quien usa `ArtisanForm`.

### Seguridad: pagos en el núcleo

- **URL de retorno no confiable, aplicado en el núcleo (AF86, cambio de comportamiento para plugins propios):** `PaymentStep` ahora degrada cualquier resultado de `resume()` de `succeeded` a `processing`, no solo el de los plugins incluidos. `PaymentRequest.signal` se aborta cuando el paso de pago se desmonta (antes nunca). `parseArtisanSchema` emite el aviso `payment-without-confirmation` cuando un paso `payment` no va seguido de un paso `wait`. **Si un plugin propio leía un éxito de la URL y dependía de eso, agregá un paso `pending` que confirme el pago en tu backend.**

### Correcciones

- **`failTo` con pasos ocultos (AF85):** el `failTo` de un paso `wait` se proyectaba a un índice de la lista completa pero se usaba como índice entre los pasos visibles, así que un paso oculto antes del destino llevaba al usuario al paso equivocado. Ahora sigue siendo un id de paso y se resuelve contra los pasos visibles cuando la espera falla (si el destino está oculto, retrocede un paso).
- **Etiqueta duplicada con un `FieldWrapper`:** un `select`, `radio` o `check` reemplazado dentro de un `FieldWrapper` mostraba su etiqueta dos veces (el paso agregaba una etiqueta de grupo encima de la del wrapper). Ahora el wrapper es dueño de la etiqueta y la ayuda de los inputs que el kit reemplaza.

### Kits de UI

- **`@beardartisans/ui-tailwind`:** el kit ahora estiliza todas las partes (switch, estrellas del rating, OTP, archivos, pantalla de estado, revisión, términos…), que antes quedaban sin estilo; nuevo aspecto esmeralda/pizarra con pestañas subrayadas para los pasos.
- **`@beardartisans/ui-bootstrap`:** el stepper muestra el paso actual y los terminados (`data-state`) y las estrellas del rating tienen estilo.

### Pagos

- **Brick de Mercado Pago:** `brick.preferenceId` puede ser una función que pide a tu backend crear la preferencia (mismas `back_urls` que `createPreference`) y devuelve su `id`, lo que habilita el login con la cuenta de Mercado Pago dentro del Brick.

### Tests

- **Tests de caracterización (AF84):** la proyección (`engine/project.ts`), el store de pasos y el borrador (`engine/draft.ts`) tienen tests propios, y el test de aislamiento de capas también rechaza imports relativos de `engine/`, `components/`, `integrations/` y `styles/` desde `schema/` y `persistence/`, además de `import()`, `require()` e imports de efecto de React, React Hook Form, Yup y Zustand. Los tres warnings de lint desaparecieron y el fallback de paso desconocido pasa por `cx` (así `unstyled` y `classNames` aplican).

### Planificación

- **Plan de evolución (AF83):** [docs/es/planning/artisanform-evolution.md](planning/artisanform-evolution.md) audita el estado actual y planifica la API headless (`useArtisanWizard`), valores tipados, workflows y migraciones de snapshots, con las decisiones tomadas. AGENTS.md lista `apps/docs` y la documentación llama `useArtisanWizard` al futuro hook headless.

### Robustez

- **Integraciones (AF77):** un mensaje de `wait` con un `status` desconocido ahora hace fallar el paso en vez de esperar al timeout, y un `websocket()` que se cierra antes de un estado final falla (cerrarlo nosotros no es un fallo). `cloudinary()` lanza un error de subida claro cuando la respuesta no es el JSON esperado. La idempotency key de pago usa `crypto.getRandomValues` cuando `randomUUID` no está disponible (contextos no seguros) en vez de `Math.random`, y falla si no hay `crypto`. La guía de archivos aclara que `accept` y `maxSize` no son un control de seguridad.

### Seguridad

- **Endurecimiento del schema (AF76):** `parseArtisanSchema` rechaza un `href` que no sea `http:`, `https:`, `mailto:` o relativo (`unsafe-url`, así que los enlaces `javascript:` se rechazan) y los nombres de campo que sean claves de prototipo o usen sintaxis de ruta (`invalid-name`). El render también omite un `href` inseguro, lo que cubre los schemas 0.2.0. Los schemas que usaban esos valores ahora fallan la validación.

### Seguridad: cambio de comportamiento

- **La URL de retorno del pago ya no es de confianza (AF78):** `resume()` de los plugins de redirección (Stripe, Mercado Pago, Lemon Squeezy y el mock) ahora informa `processing` donde antes informaba `succeeded`, porque cualquiera podía falsificar `?stripe_status=success` y hacer que el wizard registre un paso pagado. Los flujos embebidos (`render` → `onResult`) no cambian. **Si usás un checkout por redirección, agregá un paso `pending` después del de pago** para que tu backend confirme el pago; el valor `payment` del payload enviado nunca debe tratarse como prueba de pago.

### Documentación

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
