---
title: "Tipos de campo"
description: "Cada tipo de campo nativo y las propiedades que acepta."
---

:::note
Generado a partir del código fuente en tiempo de build.
:::

El parser rechaza cualquier propiedad que un tipo no acepte (`unknown-property`). Los tipos propios usan el prefijo `x-`.

| Tipo | Propósito | Propiedades aceptadas |
| --- | --- | --- |
| `text` | Texto de una línea. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `email` | Correo electrónico (formato validado). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `tel` | Número de teléfono. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `url` | URL. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `password` | Texto enmascarado; nunca se guarda en borradores. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `textarea` | Texto de varias líneas. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `number` | Entrada numérica. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `prefix` `suffix` `step` `validation` |
| `range` | Control deslizante. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `step` `validation` |
| `rating` | Valoración con estrellas (`length` estrellas). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `length` |
| `otp` | Casillas para un código de un solo uso (`length`, `charset`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `length` `charset` |
| `date` | Fecha (`YYYY-MM-DD`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `time` | Hora. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `datetime` | Fecha y hora. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `month` | Mes. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `daterange` | Dos fechas: `name` (desde) y `endName` (hasta). Produce dos valores. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` `endName` `endLabel` |
| `select` | Una opción de una lista desplegable. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `radio` | Una opción con botones de radio. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `check` | Varias opciones (grupo de casillas); el valor es un array. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `combobox` | Una opción con búsqueda (estática o `optionsSource`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `options` `optionsSource` |
| `multiselect` | Varias opciones con búsqueda y chips. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `options` `optionsSource` |
| `dynamicSelect` | Dos selects dependientes. Produce dos valores. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` `dependentName` `dependentOptions` `dependentOptionsSource` |
| `checkbox` | Casilla booleana. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` |
| `switch` | Interruptor booleano. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` |
| `file` | Subida de archivos mediante un `StorageAdapter`. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `accept` `storage` `capture` `validation` |
| `image` | Subida de imágenes con vista previa. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `accept` `storage` `capture` `validation` |
| `array` | Filas repetibles ("añadir otra"). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `itemFields` `addLabel` `validation` |
| `heading` | Contenido: encabezado. No tiene valor. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `paragraph` | Contenido: párrafo. No tiene valor. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `callout` | Contenido: nota destacada (`variant`). No tiene valor. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `divider` | Contenido: línea horizontal. No tiene valor. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
