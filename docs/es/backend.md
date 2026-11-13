# Guía de backend

> 🌐 Versión en español de [backend.md](../backend.md).

Un schema v1 es JSON plano, así que puede vivir en cualquier base de datos y ser servido por cualquier backend. Lo que un backend necesita de ArtisanForm es una forma de **comprobar** un schema antes de confiar en él, de **versionarlo** y de **validar las respuestas** que vuelven. Todo es TypeScript puro en `artisanform/schema` (sin React ni Yup; mirá [Schema v1](schema-v1.md)), más un JSON Schema y un CLI para backends que no corren Node.

La librería te da las comprobaciones y algunos ayudantes. Cómo guardás, versionás y autorizás los schemas es cosa tuya: todo lo que está en "Dónde guardarlo" es una recomendación, no un requisito.

```json
{
  "$schema": "https://unpkg.com/artisanform/dist/schema.json",
  "schemaVersion": 1,
  "id": "event-registration",
  "revision": 3,
  "steps": [
    {
      "id": "attendee",
      "type": "form",
      "title": "Asistente",
      "fields": [
        { "name": "fullName", "type": "text", "label": "Nombre completo", "required": true },
        { "name": "documentNumber", "type": "text", "label": "Documento", "sensitive": true }
      ]
    }
  ]
}
```

## El flujo

Un schema entra a tu sistema una vez (se guarda), se vuelve una revisión (se publica), se lee muchas veces (se sirve) y junta respuestas (se reciben). Cada etapa tiene una función:

| Etapa | Qué hacés | Función |
| --- | --- | --- |
| Guardar | Rechazar todo lo que no sea un schema válido que tu front pueda ejecutar | `checkSchema` |
| Publicar | Asegurar que las respuestas viejas conserven su significado; congelar la revisión | `compareSchemas`, `schemaHash` |
| Servir | Enviar la revisión con un validador de caché | `schemaHash` (ETag) |
| Recibir | Validar y limpiar las respuestas | `validateValues` |
| Leer de vuelta | Saber qué respuestas son sensibles o qué preguntas existen | `sensitiveAnswerKeys`, `answerFields` |

### Guardar un borrador

`checkSchema` es la puerta única. Parsea el contrato, aplica tu política y tus límites, hace lint y comprueba el schema contra lo que tu front registró, incluido el `config` de los tipos custom. Nunca lanza.

```ts
import {
  checkSchema,
  schemaHash,
  type CapabilitiesManifest,
} from 'artisanform/schema';

// Topes para schemas que vienen de usuarios (ver "Límites recomendados").
const limits = { maxBytes: 200_000, maxSteps: 50, maxFields: 300, maxOptions: 500 };

export async function saveDraft(
  formId: string,
  input: unknown,
  manifest: CapabilitiesManifest, // de describeRegistrations, ver abajo
) {
  const result = checkSchema(input, { limits, manifest });
  // Los errores bloquean; los avisos (un hallazgo de lint, una carencia degradable) se devuelven, no son fatales.
  if (!result.ok) return { status: 422, issues: result.issues };

  const hash = await schemaHash(result.schema);
  await db.drafts.upsert({
    formId,
    schema: result.schema, // guardalo tal como llegó: el JSON del autor
    hash,
    references: result.references, // lo que le pide al front
  });
  return { status: 200, hash, warnings: result.issues };
}
```

Para un schema que viene de fuera de tu propio equipo, pasá además una `policy`: las listas de hooks, renderers, proveedores de pago, etc. que puede nombrar. Derivala del mismo manifiesto para que las dos no se contradigan.

### Publicar una revisión

Publicar congela una revisión: una fila publicada nunca se edita, así cada respuesta puede apuntar al schema exacto con el que se dio. Antes de congelar, compará con lo que está en vivo.

```ts
import { compareSchemas } from 'artisanform/schema';

const diff = compareSchemas(live.schema, draft.schema);
if (!diff.compatible) {
  // una pregunta conservó su nombre pero cambió de tipo: las respuestas viejas cambiarían de significado
  throw conflict(diff.typeChanged);
}
// agregar o quitar preguntas, un nuevo `required` u opciones eliminadas son compatibles
await db.publish(draft.id); // archiva la que estaba en vivo y congela esta, en una transacción
```

`diff` también lista `added`, `removed`, `requiredChanged` y `optionsRemoved`, que es lo que necesitás para pedirle a la gente que complete de nuevo un formulario.

### Servirla

Una revisión publicada no cambia nunca, así que cacheala fuerte. Usá el hash como ETag.

```ts
app.get('/forms/:id/revisions/:rev', async (req, res) => {
  const row = await db.revision(req.params.id, Number(req.params.rev));
  const etag = `"${row.hash}"`;
  res.set({ ETag: etag, 'Cache-Control': 'public, max-age=31536000, immutable' });
  if (req.get('If-None-Match') === etag) return res.status(304).end();
  res.json(row.schema);
});
```

La URL de "la última publicada" cambia con el tiempo: dale `Cache-Control: no-cache` (o un `max-age` corto) con el mismo ETag para que los clientes revaliden.

### Recibir respuestas

Nunca confíes en la validación del navegador. `validateValues` es más estricto que el formulario a propósito (también comprueba que una opción sea una de las opciones, el largo de un OTP, el tamaño de una subida). Con `prune: true` devuelve las respuestas sin campos ocultos ni claves desconocidas.

```ts
import { validateValues } from 'artisanform/schema';

const form = await db.publishedRevision(formId);
const result = validateValues(form.schema, body.answers, {
  prune: true,
  dynamicOptions: await optionsOf(form.schema), // los ids a los que se resuelven tus fuentes de opciones
  maxItems: 1000,
});
if (!result.ok) return res.status(400).json({ issues: result.issues });
await db.submissions.insert({ formId, revision: form.revision, answers: result.values });
```

Los issues son `{ path, code, params }` sin texto, así tu API es neutral al idioma: el front los redacta con sus `labels`. Un campo con `optionsSource` solo se comprueba por pertenencia si pasás sus ids en `dynamicOptions`.

### Leer las respuestas de vuelta

`sensitiveAnswerKeys(schema)` lista las claves de respuesta marcadas `sensitive: true` (los dos extremos de un rango de fechas, un `array` completo si alguno de sus campos está marcado). La librería solo transporta la marca: si alguien puede leer esas respuestas lo decide tu modelo de permisos. `answerFields(schema)` lista las preguntas, que es lo que necesitás para un export o una tabla de proyección.

## Dónde guardarlo

El schema es un único documento JSON. Empezá con el modelo más simple y agregá estructura solo para lo que consultás.

### Modelo A: un documento por revisión

Una fila por revisión con el schema en una columna JSON, el hash, el estado y el número de revisión. Una fila publicada es inmutable; hay como máximo una fila publicada por formulario. Las respuestas son un documento JSON por envío, con la revisión contra la que se dieron. Alcanza para la mayoría de las apps y es el punto de partida recomendado.

### Modelo B: más una tabla de campos

Cuando necesitás indexar preguntas, asociarles permisos o armar reportes entre revisiones, proyectá los campos a una tabla al guardar un borrador, a partir de `answerFields`. El schema sigue siendo la fuente de verdad; la tabla es derivada y se reconstruye en cada guardado.

```ts
import { answerFields, sensitiveAnswerKeys } from 'artisanform/schema';

const sensitive = new Set(sensitiveAnswerKeys(schema));
const rows = answerFields(schema).map((field) => ({
  formRevisionId,
  fieldKey: field.name,
  type: field.type,
  required: 'required' in field && field.required === true,
  classification: sensitive.has(field.name) ? 'sensitive' : 'normal',
}));
```

### Modelo C: totalmente normalizado

Tablas para formularios, pasos, campos y opciones (o una tabla clave/valor para las respuestas, una fila por campo respondido) permiten correr SQL sobre cada pregunta y respuesta. Cuestan mucho: un schema es un árbol con condiciones y transiciones, así que reconstruir el JSON desde filas es código que mantenés, y cada novedad del contrato se vuelve una migración. Elegilo solo cuando tengas que consultar respuestas de forma relacional a gran escala; aun así, mantené el documento JSON como fuente de verdad y usá las tablas como índice.

### Respuestas

Guardá cada envío como un documento JSON con su revisión, y nunca reescribas el historial: una respuesta nueva es una fila nueva. Para reportar sobre unas pocas respuestas, proyectá esas columnas (o columnas generadas) en lugar de normalizar todo. Para analítica pesada, cargalas en una tabla clave/valor de un warehouse.

## Tipos de columna por base de datos

Todas guardan el mismo texto JSON. Diferencias que vale la pena conocer: algunas bases no conservan el orden de las claves (por eso hasheá con `schemaHash`, que ordena las claves, y el hash de lo que leés de vuelta es igual al de lo que guardaste), y sus validadores de JSON incorporados hablan borradores de JSON Schema más viejos que el de `artisanform/schema.json`. Consultá la documentación de tu versión para saber las funciones exactas.

### PostgreSQL

```sql
CREATE TABLE form_revisions (
  id          uuid PRIMARY KEY,
  form_id     uuid NOT NULL,
  revision    integer NOT NULL,
  status      text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema      jsonb NOT NULL
              CHECK (jsonb_typeof(schema) = 'object' AND schema->>'schemaVersion' = '1'),
  hash        text NOT NULL,
  UNIQUE (form_id, revision)
);
-- como máximo una revisión publicada por formulario
CREATE UNIQUE INDEX one_published ON form_revisions (form_id) WHERE status = 'published';

CREATE TABLE submissions (
  id          uuid PRIMARY KEY,
  revision_id uuid NOT NULL REFERENCES form_revisions (id),
  answers     jsonb NOT NULL
);
CREATE INDEX submissions_answers ON submissions USING gin (answers jsonb_path_ops);
```

`jsonb` es binario y descarta claves duplicadas y el orden de las claves. Usá la extensión `pg_jsonschema` si querés que la base compruebe la estructura con `artisanform/schema.json`.

### MySQL y MariaDB

```sql
CREATE TABLE form_revisions (
  id        BINARY(16) PRIMARY KEY,
  form_id   BINARY(16) NOT NULL,
  revision  INT NOT NULL,
  status    VARCHAR(10) NOT NULL,
  `schema`  JSON NOT NULL,           -- MariaDB: LONGTEXT CHECK (JSON_VALID(`schema`))
  hash      CHAR(64) NOT NULL,
  schema_id VARCHAR(100) GENERATED ALWAYS AS (`schema`->>'$.id') STORED,
  UNIQUE KEY (form_id, revision),
  KEY (schema_id)
);
```

El tipo `JSON` de MySQL valida la sintaxis y reordena las claves. `JSON_SCHEMA_VALID()` acepta solo el borrador 4, así que no puede usar `schema.json` tal cual; dejá las comprobaciones estructurales en tu app. En MariaDB, `JSON` es un alias de `LONGTEXT`, así que agregá vos el chequeo `JSON_VALID`.

### SQL Server

```sql
CREATE TABLE form_revisions (
  id        uniqueidentifier PRIMARY KEY,
  form_id   uniqueidentifier NOT NULL,
  revision  int NOT NULL,
  status    nvarchar(10) NOT NULL,
  [schema]  nvarchar(max) NOT NULL CHECK (ISJSON([schema]) = 1),
  hash      char(64) NOT NULL,
  schema_id AS JSON_VALUE([schema], '$.id'),
  CONSTRAINT uq_form_revision UNIQUE (form_id, revision)
);
```

`nvarchar(max)` con `ISJSON` conserva el texto exactamente como se guardó. Las versiones nuevas y Azure SQL agregan un tipo `json` nativo; revisá la tuya.

### Oracle

```sql
CREATE TABLE form_revisions (
  id        RAW(16) PRIMARY KEY,
  form_id   RAW(16) NOT NULL,
  revision  NUMBER(10) NOT NULL,
  status    VARCHAR2(10) NOT NULL,
  schema_doc JSON NOT NULL,          -- 21c en adelante; antes: CLOB CHECK (schema_doc IS JSON STRICT)
  hash      CHAR(64) NOT NULL,
  CONSTRAINT uq_form_revision UNIQUE (form_id, revision)
);
```

`schema` es una palabra clave de SQL, por eso estos ejemplos la entrecomillan o la renombran donde una base lo necesita. Las versiones recientes de Oracle pueden validar un documento contra un JSON Schema en una restricción `IS JSON VALIDATE`.

### SQLite

```sql
CREATE TABLE form_revisions (
  id       TEXT PRIMARY KEY,
  form_id  TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status   TEXT NOT NULL,
  schema   TEXT NOT NULL CHECK (json_valid(schema) AND json_extract(schema, '$.schemaVersion') = 1),
  hash     TEXT NOT NULL,
  UNIQUE (form_id, revision)
);
```

### MongoDB

Una revisión es un documento; no hace falta ningún mapeo.

```js
db.createCollection('form_revisions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['formId', 'revision', 'status', 'hash', 'schema'],
      properties: {
        status: { enum: ['draft', 'published', 'archived'] },
        schema: { bsonType: 'object', required: ['schemaVersion', 'id', 'steps'] },
      },
    },
  },
});
db.form_revisions.createIndex({ formId: 1, revision: 1 }, { unique: true });
```

El `$jsonSchema` de MongoDB es un subconjunto del borrador 4 sin `$ref`, así que validá ahí solo el sobre y corré `checkSchema` en tu app. El parser ya rechaza los nombres de campo con `.`, `[` o `]`; evitá también los que empiezan con `$`.

## Validar el contrato sin Node

`artisanform/schema.json` es el JSON Schema (borrador 2020-12) de la estructura de un schema v1: tipos, claves conocidas, enums y propiedades obligatorias. Sirve cualquier validador de ese borrador (ajv, `jsonschema` de Python, una librería de JSON Schema para la JVM o .NET). A propósito **no** cubre las reglas que necesitan el documento completo: nombres e ids únicos, referencias entre campos y pasos, el flujo, la política, los límites y las capacidades. Para eso, corré el CLI como subproceso, o `checkSchema` en un servicio Node pequeño.

```bash
npx artisanform validate schema.json --max-bytes 200000 --max-fields 300 --manifest capabilities.json
npx artisanform json-schema > artisanform.schema.json
npx artisanform hash schema.json
```

`validate` imprime una línea por issue y sale con `0` cuando todos los archivos son válidos, `1` cuando un schema tiene errores y `2` por uso incorrecto. Agregá `--json` para un reporte legible por máquinas. Ponelo en el CI para schemas guardados en un repositorio, o en un hook de pre-commit.

Agregá `"$schema": "https://unpkg.com/artisanform/dist/schema.json"` a un archivo de schema y la mayoría de los editores lo van a completar y comprobar mientras escribís.

## Plugins y tipos custom

Un schema solo nombra cosas que viven en la app: hooks, estrategias de espera, renderers, acciones, fuentes de opciones, proveedores de pago, adaptadores de storage y tipos de campo y de paso custom (`x-…`). Las mismas comprobaciones corren en tres lugares para que no se contradigan: tu backend al guardar una revisión, el CLI en el CI y `<ArtisanForm>` antes de renderizar.

### Declarar la forma de un tipo custom

Dale a cada campo o paso custom un `spec`: la forma de su `config`, como datos planos (un subconjunto pequeño de JSON Schema: `type`, `enum`, `minimum`, `maximum`, `minLength`, `maxLength`, `items`, `properties`, `required`, `additionalProperties`).

```ts
import type { FieldRegistry } from 'artisanform';

const fields: FieldRegistry = {
  stars: {
    render,
    initialValues,
    rules,
    spec: {
      type: 'x-stars',
      kind: 'field',
      config: {
        type: 'object',
        required: ['max'],
        properties: { max: { type: 'integer', minimum: 1, maximum: 10 } },
        additionalProperties: false,
      },
    },
  },
};
```

### Generar el manifiesto con lo que registrás

`describeRegistrations` deriva el manifiesto de capacidades de las mismas props que le das a `<ArtisanForm>`: una sola fuente en lugar de cuatro listas mantenidas a mano. Corrélo donde tu app hace el build, y entregá el JSON a tu API y al CLI.

```ts
import { describeRegistrations } from 'artisanform';
import { writeFileSync } from 'node:fs';

const manifest = describeRegistrations({ extensions, fields, stepTypes, plugins, storage });
writeFileSync('capabilities.json', JSON.stringify(manifest, null, 2));
```

El manifiesto lleva cada `spec`, así el backend verifica el `config` custom de un schema (`invalid-config`, con la ruta exacta) sin ejecutar nada de tu código.

### Qué detiene un formulario y qué solo avisa

| Hallazgo | Severidad | Qué ve el usuario |
| --- | --- | --- |
| Schema inválido, violación de política o de límite | error | el formulario se reemplaza por un mensaje |
| Hook, wait strategy, renderer o acción ausente | error | el formulario se reemplaza por un mensaje |
| Proveedor de pago no registrado | error | el formulario se reemplaza por un mensaje, antes de completar nada |
| Tipo de paso no registrado, `config` custom inválido | error | el formulario se reemplaza por un mensaje |
| Fuente de opciones no registrada | aviso | el campo no muestra opciones |
| Adaptador de storage no registrado | aviso | el campo muestra su propio aviso al agregar un archivo |
| Tipo de campo custom no registrado | aviso | ese campo muestra un aviso "Unknown field type" |
| Hallazgo de lint, cualquier cosa de un schema 0.2.0 | aviso | nada; se informa |

La puerta del backend (`checkSchema`) y `<ArtisanForm>` usan la misma clasificación (`capabilitySeverity`).

### Mostrar errores sin romper el formulario

`<ArtisanForm>` nunca lanza una excepción ante un schema que no puede ejecutarse. Muestra un mensaje corto y traducible (`labels.schemaErrorMessage`); fuera de producción además lista cada error con su código y ruta (`showSchemaIssues`). Todo, errores y avisos, va a `onSchemaIssues`, así podés registrar o alertar. `fallback` reemplaza el mensaje por tu propio nodo o función.

```tsx
<ArtisanForm
  scheme={schema}
  onSchemaIssues={(issues) => logger.warn('form schema', issues)}
  fallback={<ContactSupport />}
  onSubmit={save}
/>
```

Un formulario bloqueado nunca lee ni pisa un borrador guardado, y cuando se corrige el schema el formulario vuelve sin remontarse.

## Límites recomendados

Ninguno se aplica si no lo definís. Para schemas que vienen de usuarios, empezá por acá:

| Límite | Dónde | Sugerido |
| --- | --- | --- |
| Tamaño del schema | `limits.maxBytes` | 200 000 |
| Pasos | `limits.maxSteps` | 50 |
| Campos (cuentan las filas de arrays y los campos de contenido) | `limits.maxFields` | 300 |
| Opciones en una lista | `limits.maxOptions` | 500 |
| Elementos en una lista de respuesta | `maxItems` de `validateValues` | 1 000 (el valor por defecto) |
| Largo de una respuesta de texto | `maxStringLength` de `validateValues` | 10 000 (el valor por defecto) |
