# Constructor visual de formularios

> 🌐 Versión en español de [builder.md](../builder.md).

`artisanform/builder` es un editor con arrastrar y soltar que produce un [`ArtisanSchemaV1`](schema-v1.md). Ponlo en un CRM o un panel de administración para que quien no escribe JSON arme un formulario, lo vea en vivo y guarde el schema que tu backend almacena y sirve ([guía de backend](backend.md)). La salida es solo el schema: sin lógica de negocio ni almacenamiento.

## Instalación

El builder es un entry opcional. Su arrastrar y soltar usa `@dnd-kit`, declarado como **peers opcionales** (nada más del paquete los necesita):

```bash
bun add artisanform @dnd-kit/core @dnd-kit/sortable
```

## Inicio rápido

```tsx
'use client';
import 'artisanform/style.css'; // la vista previa es un <ArtisanForm> real
import 'artisanform/builder.css';
import { FormBuilder } from 'artisanform/builder';

export default function Editor() {
  return (
    <FormBuilder
      defaultValue={stored}               // un ArtisanSchemaV1, u omítelo para empezar en blanco
      onChange={({ schema, ok, issues }) => setDraft(schema)}
      onSave={({ schema, hash }) => api.save(schema, hash)}
    />
  );
}
```

`onChange` se dispara en cada edición con `{ schema, ok, issues }` (`ok` es false mientras haya un problema de nivel error). `onSave` se llama desde el botón Guardar de la barra, solo con el schema válido, con los mismos campos más `hash`: el SHA-256 del JSON canónico, útil como ETag.

## Las partes

| Parte | Qué hace |
| --- | --- |
| Paleta | Todos los tipos de input por categoría; arrástralo al canvas, o pulsa Enter o haz clic para agregarlo |
| Canvas | Pasos como pestañas, campos como lista ordenable; seleccionar, duplicar, quitar, reordenar o mover a otro paso; los grupos repetibles contienen filas |
| Inspector | Los ajustes de lo seleccionado (formulario, paso o campo), generados desde el catálogo; editores de opciones y de validación |
| Vista previa | El `<ArtisanForm>` real con el schema en memoria (no guarda borrador ni envía nada); ancho de dispositivo, tema e idioma |
| Problemas | `checkSchema` en vivo: cada problema salta al elemento al que se refiere |
| Barra | Deshacer y rehacer (100 pasos), modo simple o avanzado, indicador de validez, copiar JSON, guardar |
| Paneles | JSON (editar e importar), plantillas y traducciones |

La vista previa reinicia lo escrito cuando cambia el schema (es lo que hace `<ArtisanForm>` con un schema nuevo).

## Props

| Prop | Significado |
| --- | --- |
| `value` / `defaultValue` | Schema controlado o no controlado |
| `onChange` / `onSave` | Ver arriba |
| `manifest` o `registrations` | Lo que tu front puede ejecutar (`describeCapabilities` / `describeRegistrations`): alimenta los tipos custom y los desplegables de ids de hooks, estrategias y renderers |
| `policy`, `limits` | Los mismos del parser: también deciden qué inputs se ofrecen |
| `baseline` | El schema publicado: se avisa si se cambia el tipo de una pregunta que ya tiene respuestas (`compareSchemas`) |
| `mode` | `simple` (por defecto) oculta ajustes avanzados y de desarrollador; `advanced` muestra todo |
| `readOnly` | No se puede editar nada; la vista previa y el JSON siguen funcionando |
| `features` | Apaga módulos: `conditions`, `steps`, `translations`, `templates`, `import`, `json`, `preview` (todos activos por defecto) |
| `templates` | Puntos de partida de la galería (por defecto: en blanco, contacto, registro, encuesta, postulación) |
| `previewProps` | Props del `<ArtisanForm>` de la vista previa: `components`, `extensions`, `theme`… |
| `labels`, `classNames`, `unstyled` | Textos y estilos, ver abajo |

## Tipos custom

Un tipo custom `x-*` descrito en el manifiesto aparece en la paleta. Si su spec tiene una forma `config`, el inspector genera los controles desde ella (números con su rango, enums como desplegable, booleanos como casilla); sin forma, el config se edita como JSON.

```tsx
import { describeCapabilities } from 'artisanform/schema';

const manifest = describeCapabilities({
  customTypes: [{ type: 'x-satisfaction', kind: 'field', config: { type: 'object', required: ['max'], properties: { max: { type: 'integer', minimum: 1, maximum: 10 } } } }],
});
<FormBuilder manifest={manifest} />;
```

## Condiciones, pasos y traducciones

Cada uno es un módulo que se apaga con `features`. Las condiciones (`visibleWhen`, `next[].when`) se arman con un selector de campo, un operador y un valor tipado según el campo, con grupos `all`/`any`/`not`. Los pasos se agregan en cualquier tipo nativo, se reordenan y se enlazan con `next`, bucles y `revisit`; un resumen del flujo lista el camino alcanzable y avisa de pasos inalcanzables o bucles sin tope. Las traducciones listan cada texto traducible por idioma, marcan los faltantes, huérfanos y con marcadores distintos, y escriben el bloque `i18n` del schema.

## Teclado y accesibilidad

Arrastra con el mouse o el dedo; con el teclado enfoca un asa, pulsa Espacio para levantar, las flechas para mover, Espacio para soltar y Escape para cancelar; una región en vivo anuncia cada paso. Cada fila tiene además botones de subir y bajar, duplicar, quitar y mover a un paso, así que nada exige arrastrar. El builder se verifica con axe en las pruebas end-to-end.

## Compón tu propio layout

`<FormBuilder>` es `FormBuilderProvider` más las partes. Úsalas por separado (`Palette`, `Canvas`, `Inspector`, `Preview`, `Issues`, `Toolbar`, `Flow`, `JsonPanel`…) dentro de `FormBuilderProvider` y lee el estado con `useBuilder()`. El modelo puro (`addField`, `moveField`, `setProperty`, operaciones que respetan `checkSchema`, los catálogos y el historial) también se exporta y no tiene React.

```tsx
import { FormBuilderProvider, Palette, Canvas, Inspector } from 'artisanform/builder';

<FormBuilderProvider defaultValue={schema} onChange={save}>
  <Palette /><Canvas /><Inspector />
</FormBuilderProvider>;
```

## Estilos

`artisanform/builder.css` es aparte de `style.css` y solo se carga si usas el builder. Usa clases `afb-*` simples y las variables `--artisan-*` del formulario (cada una con respaldo), así que sigue tu tema. `classNames` agrega clases por slot y `unstyled` quita las propias. Se adapta al ancho de su contenedor, no al de la ventana.

## Textos

Todo texto está en inglés por defecto y es sobrescribible: pasa `labels={{ … }}` (un `BuilderLabels` parcial; `defaultBuilderLabels` lista las claves).

## Next.js

`artisanform/builder` lleva la directiva `'use client'`, así que funciona en ambos routers; importa las dos hojas de estilo una vez en un layout o en la página cliente.

## Limitaciones

- El estilo del stepper y los iconos de paso no son editables: el contrato 1.x aún no tiene esas propiedades. Están previstos como un cambio aditivo.
- Los grupos repetibles contienen filas planas (sin grupos anidados, contenido ni tipos custom), como el contrato.
- El código de hooks, renderers y estrategias nunca se edita: solo se eligen ids registrados.
- No hay edición colaborativa ni almacenamiento: persistes el schema con los callbacks.
