---
title: "Field types"
description: "Every native field type and the properties it accepts."
---

:::note
Generated from the source code at build time.
:::

The parser rejects any property a type does not accept (`unknown-property`). Custom types use the `x-` prefix.

| Type | Purpose | Accepted properties |
| --- | --- | --- |
| `text` | Single-line text. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `email` | Email address (format validated). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `tel` | Telephone number. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `url` | URL. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `password` | Masked text; never saved in drafts. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `textarea` | Multi-line text. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `mask` `prefix` `suffix` `autoComplete` `inputMode` `readOnly` `maxLength` `validation` |
| `number` | Numeric input. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `prefix` `suffix` `step` `validation` |
| `range` | Slider. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `step` `validation` |
| `rating` | Star rating (`length` stars). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `length` |
| `otp` | One-time code boxes (`length`, `charset`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `length` `charset` |
| `date` | Date (`YYYY-MM-DD`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `time` | Time. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `datetime` | Date and time. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `month` | Month. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` |
| `daterange` | Two dates: `name` (from) and `endName` (to). Produces two values. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `validation` `endName` `endLabel` |
| `select` | Single choice from a dropdown. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `radio` | Single choice from radio buttons. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `check` | Several choices (checkbox group); value is an array. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` |
| `combobox` | Searchable single choice (static or `optionsSource`). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `options` `optionsSource` |
| `multiselect` | Searchable multiple choice with chips. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `placeholder` `options` `optionsSource` |
| `dynamicSelect` | Two dependent selects. Produces two values. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `options` `dependentName` `dependentOptions` `dependentOptionsSource` |
| `checkbox` | Boolean checkbox. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` |
| `switch` | Boolean switch. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` |
| `file` | File upload through a `StorageAdapter`. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `accept` `storage` `capture` `validation` |
| `image` | Image upload with preview. | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `accept` `storage` `capture` `validation` |
| `array` | Repeatable rows ("add another"). | `type` `id` `name` `label` `description` `required` `disabled` `defaultValue` `visibleWhen` `ui` `itemFields` `addLabel` `validation` |
| `heading` | Content: heading. Holds no value. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `paragraph` | Content: paragraph. Holds no value. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `callout` | Content: highlighted note (`variant`). Holds no value. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
| `divider` | Content: horizontal rule. Holds no value. | `type` `name` `id` `text` `variant` `visibleWhen` `ui` |
