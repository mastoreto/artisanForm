/** Every user-visible text of the library; override any of them via `labels`. */
export interface ArtisanLabels {
  previous: string;
  next: string;
  submit: string;
  progress: string;
  step: (n: number, total: number, title: string) => string;
  stepItem: (n: number) => string;
  loadingOptions: string;
  loadOptionsError: string;
  required: string;
  submitError: string;
  edit: string;
  changeMethod: string;
  addItem: string;
  removeItem: (n: number) => string;
  itemTitle: (n: number) => string;
  minItems: (n: number) => string;
  maxItems: (n: number) => string;
  noResults: string;
  searching: string;
  dateTo: string;
  endBeforeStart: string;
  pay: string;
  loadingPayment: string;
  payWith: (name: string) => string;
  payHintEmbedded: string;
  payHintRedirect: string;
  choosePayment: string;
  paying: string;
  paymentFailed: string;
  paymentProcessing: string;
  noPaymentPlugin: string;
  waiting: string;
  waitFailed: string;
  waitTimeout: string;
  cancel: string;
  dropFiles: string;
  chooseFiles: string;
  fileUploading: string;
  fileTooLarge: (max: string) => string;
  fileWrongType: string;
  tooManyFiles: (max: number) => string;
  minFiles: (min: number) => string;
  removeFile: (name: string) => string;
  cancelUpload: (name: string) => string;
  retryUpload: (name: string) => string;
  uploadFailed: string;
  noStorage: string;
  /** Shown instead of a form whose schema cannot run (the issues go to `onSchemaIssues`). */
  schemaErrorMessage: string;
  unknownFieldType: (type: string) => string;
  unknownStepKind: (kind: string) => string;
  acceptTerms: string;
  readFullTerms: string;
  yes: string;
  no: string;
  retry: string;
  backToForm: string;
  submitting: string;
  successMessage: string;
  invalidEmail: string;
  invalidNumber: string;
  invalidPattern: string;
  invalidUrl: string;
  invalidPhone: string;
  minDate: (date: string) => string;
  maxDate: (date: string) => string;
  mustMatch: string;
  minLength: (n: number) => string;
  maxLength: (n: number) => string;
  minValue: (n: number) => string;
  maxValue: (n: number) => string;
}

export const defaultLabels: ArtisanLabels = {
  previous: 'Previous',
  next: 'Next',
  submit: 'Finish',
  progress: 'Progress',
  step: (n, total, title) => `Step ${n} of ${total}: ${title}`,
  stepItem: (n) => `Step ${n}: `,
  loadingOptions: 'Loading…',
  loadOptionsError: 'Could not load the options',
  required: 'Required field',
  submitError: 'Could not submit the form',
  edit: 'Edit',
  changeMethod: 'Choose another payment method',
  addItem: 'Add another',
  removeItem: (n) => `Remove item ${n}`,
  itemTitle: (n) => `Item ${n}`,
  minItems: (n) => `Add at least ${n}`,
  maxItems: (n) => `Maximum ${n} items`,
  noResults: 'No results',
  searching: 'Searching…',
  dateTo: 'To',
  endBeforeStart: 'The end date is before the start date',
  pay: 'Pay',
  loadingPayment: 'Loading the payment method…',
  payWith: (name) => `Pay with ${name}`,
  payHintEmbedded: 'Pay on this page',
  payHintRedirect: 'You will be redirected',
  choosePayment: 'Choose how to pay',
  paying: 'Redirecting to payment…',
  paymentFailed: 'The payment could not be completed',
  paymentProcessing: 'Recording the payment…',
  noPaymentPlugin: 'No payment method is configured for this step',
  waiting: 'Waiting for confirmation…',
  waitFailed: 'We could not confirm the operation',
  waitTimeout: 'The confirmation took too long',
  cancel: 'Cancel',
  dropFiles: 'Drag files here or',
  chooseFiles: 'choose from your device',
  fileUploading: 'Wait for the files to finish uploading',
  fileTooLarge: (max) => `The file exceeds the maximum of ${max}`,
  fileWrongType: 'File type not allowed',
  tooManyFiles: (max) => `Maximum ${max} files`,
  minFiles: (min) => `Upload at least ${min} files`,
  removeFile: (name) => `Remove ${name}`,
  cancelUpload: (name) => `Cancel ${name}`,
  retryUpload: (name) => `Retry ${name}`,
  uploadFailed: 'Upload failed',
  noStorage: 'No storage is configured for this field',
  schemaErrorMessage: 'This form is not available right now',
  unknownFieldType: (type) => `Unknown field type "${type}"`,
  unknownStepKind: (kind) => `Unknown step kind "${kind}"`,
  acceptTerms: 'I accept the terms and conditions',
  readFullTerms: 'Read the full document',
  yes: 'Yes',
  no: 'No',
  retry: 'Retry',
  backToForm: 'Back to the form',
  submitting: 'Submitting…',
  successMessage: 'Done! We received your information.',
  invalidEmail: 'Invalid email',
  invalidNumber: 'Invalid number',
  invalidPattern: 'Invalid format',
  invalidUrl: 'Invalid URL',
  invalidPhone: 'Invalid phone number',
  minDate: (date) => `From ${date}`,
  maxDate: (date) => `Until ${date}`,
  mustMatch: 'The values do not match',
  minLength: (n) => `Minimum ${n} characters`,
  maxLength: (n) => `Maximum ${n} characters`,
  minValue: (n) => `Minimum ${n}`,
  maxValue: (n) => `Maximum ${n}`,
};
