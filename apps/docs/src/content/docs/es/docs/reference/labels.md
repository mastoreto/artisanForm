---
title: "Labels"
description: "Cada texto incorporado, con su valor por defecto en inglés."
---

:::note
Generado a partir del código fuente en tiempo de build.
:::

Sobrescribe cualquiera con la prop `labels`. Las funciones reciben los valores que muestra la firma.

| Clave | Tipo | Por defecto |
| --- | --- | --- |
| `previous` | texto | "Previous" |
| `next` | texto | "Next" |
| `submit` | texto | "Finish" |
| `progress` | texto | "Progress" |
| `step` | función | `(n, total, title) => `Step ${n} of ${total}: ${title}`` |
| `stepItem` | función | `(n) => `Step ${n}: `` |
| `loadingOptions` | texto | "Loading…" |
| `loadOptionsError` | texto | "Could not load the options" |
| `required` | texto | "Required field" |
| `submitError` | texto | "Could not submit the form" |
| `edit` | texto | "Edit" |
| `changeMethod` | texto | "Choose another payment method" |
| `addItem` | texto | "Add another" |
| `removeItem` | función | `(n) => `Remove item ${n}`` |
| `itemTitle` | función | `(n) => `Item ${n}`` |
| `minItems` | función | `(n) => `Add at least ${n}`` |
| `maxItems` | función | `(n) => `Maximum ${n} items`` |
| `noResults` | texto | "No results" |
| `searching` | texto | "Searching…" |
| `dateTo` | texto | "To" |
| `endBeforeStart` | texto | "The end date is before the start date" |
| `pay` | texto | "Pay" |
| `loadingPayment` | texto | "Loading the payment method…" |
| `payWith` | función | `(name) => `Pay with ${name}`` |
| `choosePayment` | texto | "Choose how to pay" |
| `paying` | texto | "Redirecting to payment…" |
| `paymentFailed` | texto | "The payment could not be completed" |
| `paymentProcessing` | texto | "Recording the payment…" |
| `noPaymentPlugin` | texto | "No payment method is configured for this step" |
| `waiting` | texto | "Waiting for confirmation…" |
| `waitFailed` | texto | "We could not confirm the operation" |
| `dropFiles` | texto | "Drag files here or" |
| `chooseFiles` | texto | "choose from your device" |
| `fileUploading` | texto | "Wait for the files to finish uploading" |
| `fileTooLarge` | función | `(max) => `The file exceeds the maximum of ${max}`` |
| `fileWrongType` | texto | "File type not allowed" |
| `tooManyFiles` | función | `(max) => `Maximum ${max} files`` |
| `minFiles` | función | `(min) => `Upload at least ${min} files`` |
| `removeFile` | función | `(name) => `Remove ${name}`` |
| `cancelUpload` | función | `(name) => `Cancel ${name}`` |
| `retryUpload` | función | `(name) => `Retry ${name}`` |
| `uploadFailed` | texto | "Upload failed" |
| `noStorage` | texto | "No storage is configured for this field" |
| `acceptTerms` | texto | "I accept the terms and conditions" |
| `readFullTerms` | texto | "Read the full document" |
| `yes` | texto | "Yes" |
| `no` | texto | "No" |
| `retry` | texto | "Retry" |
| `backToForm` | texto | "Back to the form" |
| `submitting` | texto | "Submitting…" |
| `successMessage` | texto | "Done! We received your information." |
| `invalidEmail` | texto | "Invalid email" |
| `invalidNumber` | texto | "Invalid number" |
| `invalidPattern` | texto | "Invalid format" |
| `invalidUrl` | texto | "Invalid URL" |
| `invalidPhone` | texto | "Invalid phone number" |
| `minDate` | función | `(date) => `From ${date}`` |
| `maxDate` | función | `(date) => `Until ${date}`` |
| `mustMatch` | texto | "The values do not match" |
| `minLength` | función | `(n) => `Minimum ${n} characters`` |
| `maxLength` | función | `(n) => `Maximum ${n} characters`` |
| `minValue` | función | `(n) => `Minimum ${n}`` |
| `maxValue` | función | `(n) => `Maximum ${n}`` |
