---
title: "Tipos de paso"
description: "Cada tipo de paso nativo y las propiedades que acepta."
---

:::note
Generado a partir del código fuente en tiempo de build.
:::

| Tipo | Propósito | Propiedades aceptadas |
| --- | --- | --- |
| `form` | Un conjunto de campos que se validan juntos. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `fields` |
| `payment` | Cobra mediante uno o más plugins de pago. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `providers` `resultName` `summary` |
| `wait` | Espera algo externo (polling, SSE, WebSocket, callback). | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `strategy` `message` `resultName` `failTo` |
| `terms` | Texto y/o enlace de términos más una aceptación obligatoria. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `content` `href` `accept` |
| `review` | Resumen de las respuestas anteriores con un botón de editar por paso. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` |
| `result` | Pantalla final tras enviar (éxito o error). | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `message` `errorMessage` `actions` |
| `custom` | Lo renderiza una función registrada en `extensions.renderers`. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `renderer` `config` |
