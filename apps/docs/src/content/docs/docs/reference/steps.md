---
title: "Step types"
description: "Every native step type and the properties it accepts."
---

:::note
Generated from the source code at build time.
:::

| Type | Purpose | Accepted properties |
| --- | --- | --- |
| `form` | A set of fields validated together. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `fields` |
| `payment` | Charges through one or more payment plugins. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `providers` `resultName` `summary` |
| `wait` | Waits for something external (polling, SSE, WebSocket, callback). | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `strategy` `message` `resultName` `failTo` |
| `terms` | Terms text and/or link plus a required acceptance. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `content` `href` `accept` |
| `review` | Summary of the previous answers with an edit button per step. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` |
| `result` | Final screen after submit (success or error). | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `message` `errorMessage` `actions` |
| `custom` | Rendered by a function registered in `extensions.renderers`. | `type` `id` `title` `visibleWhen` `ui` `controls` `hooks` `renderer` `config` |
