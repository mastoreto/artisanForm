# Versionado y el contrato 1.x

> 🌐 Versión en español de [versioning.md](../versioning.md).

Desde la 1.0.0 la librería sigue versionado semántico sobre **tres superficies públicas**. Todo lo que no figura aquí es interno y puede cambiar en cualquier versión.

1. **El contrato del schema** (`schemaVersion: 1`): lo que acepta el parser y lo que produce `normalizeArtisanSchema` ([schema v1](schema-v1.md)).
2. **La API de TypeScript** de la entrada raíz (`artisanform`) y de `artisanform/schema`, con instantánea en `api/index.api.txt` y `api/schema.api.txt`.
3. **El contrato de capacidades** (`artisanform.capabilities/1`) y el **formato de catálogos** (rutas de texto como `steps.<id>.fields.<name>.label`, `labels.<clave>`).

## Qué puede cambiar en una menor (1.x)

- Una propiedad **opcional** nueva en un elemento existente, una opción nueva y opcional de un paso o campo, un export nuevo, una clave nueva de `labels`, un `Feature` nuevo del contrato de capacidades.
- Un **tipo de campo o paso nuevo**. Un front construido con una 1.x anterior no lo conoce: lo informa como `unsupported-field-type` / `unsupported-step-kind` con `checkCapabilities`, así que una API rechaza el schema en vez de renderizarlo mal.
- Validaciones más estrictas que solo rechazan lo que ya carecía de sentido (documentadas en el changelog).

## Qué exige una mayor (2.0)

- Quitar o renombrar una propiedad, un tipo, un código, una ruta o un export; cambiar lo que significa un schema válido; volver obligatoria una propiedad opcional.
- Un schema que parseaba y normalizaba en 1.x y deja de hacerlo, o normaliza a otro JSON (incluidos los valores por defecto).
- Cambiar un `code` de incidencia del parser, de `validateValues` o del contrato de capacidades.

`schemaVersion` sigue en `1` durante toda la línea 1.x. Un lector que ve un número mayor lo rechaza (`unsupported-version`).

## Cómo se hace cumplir

| Guardia | Qué detecta |
|---|---|
| `src/schema/__tests__/golden.test.ts` + `fixtures-v1/` | Los 13 ejemplos del catálogo deben parsear sin incidencias, normalizar al JSON registrado, ser idempotentes y portables; los casos inválidos mantienen sus códigos y rutas exactos |
| `src/schema/__tests__/docs.test.ts` | Todos los ejemplos JSON/TypeScript de la guía del schema parsean |
| `bun run check:api` (CI, release, `prepublishOnly`) | Cualquier cambio en los exports o declaraciones de las dos entradas. Las líneas quitadas o cambiadas rompen; las agregadas son menores |
| Fixtures de paridad (`src/schema/__tests__/values/`) | El navegador (Yup) y `validateValues` coinciden en las reglas compartidas |

Cuando una guardia falla el cambio no es "actualizar el fixture": decide si es una menor o una mayor y luego actualiza la instantánea o el fixture **en el mismo PR** (`node scripts/check-api.mjs --write`, `UPDATE_GOLDEN=1 bun test golden`) para que el diff se revise.

## Deprecación

Un nombre deprecado sigue funcionando durante toda la mayor, se marca `@deprecated` con su reemplazo y se lista en el changelog. Solo se elimina en la siguiente mayor.

## Schemas almacenados

Cómo guardarlos, servirlos y validarlos en una base de datos está en la [guía de backend](backend.md). `checkSchema`, `schemaHash`, `compareSchemas`, `artisanform/schema.json` y el CLI `artisanform` son parte de la superficie pública y siguen las mismas reglas.

La normalización es determinista e idempotente, así que un schema guardado con una revisión se renderiza igual en cualquier 1.x. Los borradores de formularios en curso llevan la `revision` y siguen las reglas de instantáneas de [schema v1](schema-v1.md#11-persistencia-).
