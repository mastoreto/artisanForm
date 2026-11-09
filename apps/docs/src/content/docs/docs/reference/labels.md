---
title: "Labels"
description: "Every built-in text, with its English default."
---

:::note
Generated from the source code at build time.
:::

Override any of them with the `labels` prop. Functions receive the values shown in the signature.

| Key | Kind | Default |
| --- | --- | --- |
| `previous` | string | "Previous" |
| `next` | string | "Next" |
| `submit` | string | "Finish" |
| `progress` | string | "Progress" |
| `step` | function | `(n, total, title) => `Step ${n} of ${total}: ${title}`` |
| `stepItem` | function | `(n) => `Step ${n}: `` |
| `loadingOptions` | string | "Loading…" |
| `loadOptionsError` | string | "Could not load the options" |
| `required` | string | "Required field" |
| `submitError` | string | "Could not submit the form" |
| `edit` | string | "Edit" |
| `changeMethod` | string | "Choose another payment method" |
| `addItem` | string | "Add another" |
| `removeItem` | function | `(n) => `Remove item ${n}`` |
| `itemTitle` | function | `(n) => `Item ${n}`` |
| `minItems` | function | `(n) => `Add at least ${n}`` |
| `maxItems` | function | `(n) => `Maximum ${n} items`` |
| `noResults` | string | "No results" |
| `searching` | string | "Searching…" |
| `dateTo` | string | "To" |
| `endBeforeStart` | string | "The end date is before the start date" |
| `pay` | string | "Pay" |
| `loadingPayment` | string | "Loading the payment method…" |
| `payWith` | function | `(name) => `Pay with ${name}`` |
| `choosePayment` | string | "Choose how to pay" |
| `paying` | string | "Redirecting to payment…" |
| `paymentFailed` | string | "The payment could not be completed" |
| `paymentProcessing` | string | "Recording the payment…" |
| `noPaymentPlugin` | string | "No payment method is configured for this step" |
| `waiting` | string | "Waiting for confirmation…" |
| `waitFailed` | string | "We could not confirm the operation" |
| `dropFiles` | string | "Drag files here or" |
| `chooseFiles` | string | "choose from your device" |
| `fileUploading` | string | "Wait for the files to finish uploading" |
| `fileTooLarge` | function | `(max) => `The file exceeds the maximum of ${max}`` |
| `fileWrongType` | string | "File type not allowed" |
| `tooManyFiles` | function | `(max) => `Maximum ${max} files`` |
| `minFiles` | function | `(min) => `Upload at least ${min} files`` |
| `removeFile` | function | `(name) => `Remove ${name}`` |
| `cancelUpload` | function | `(name) => `Cancel ${name}`` |
| `retryUpload` | function | `(name) => `Retry ${name}`` |
| `uploadFailed` | string | "Upload failed" |
| `noStorage` | string | "No storage is configured for this field" |
| `acceptTerms` | string | "I accept the terms and conditions" |
| `readFullTerms` | string | "Read the full document" |
| `yes` | string | "Yes" |
| `no` | string | "No" |
| `retry` | string | "Retry" |
| `backToForm` | string | "Back to the form" |
| `submitting` | string | "Submitting…" |
| `successMessage` | string | "Done! We received your information." |
| `invalidEmail` | string | "Invalid email" |
| `invalidNumber` | string | "Invalid number" |
| `invalidPattern` | string | "Invalid format" |
| `invalidUrl` | string | "Invalid URL" |
| `invalidPhone` | string | "Invalid phone number" |
| `minDate` | function | `(date) => `From ${date}`` |
| `maxDate` | function | `(date) => `Until ${date}`` |
| `mustMatch` | string | "The values do not match" |
| `minLength` | function | `(n) => `Minimum ${n} characters`` |
| `maxLength` | function | `(n) => `Maximum ${n} characters`` |
| `minValue` | function | `(n) => `Minimum ${n}`` |
| `maxValue` | function | `(n) => `Maximum ${n}`` |
