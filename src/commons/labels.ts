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
  choosePayment: string;
  paying: string;
  paymentFailed: string;
  paymentProcessing: string;
  noPaymentPlugin: string;
  waiting: string;
  waitFailed: string;
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
  previous: 'Anterior',
  next: 'Siguiente',
  submit: 'Finalizar',
  progress: 'Progreso',
  step: (n, total, title) => `Paso ${n} de ${total}: ${title}`,
  stepItem: (n) => `Paso ${n}: `,
  loadingOptions: 'Cargando…',
  loadOptionsError: 'No se pudieron cargar las opciones',
  required: 'Campo requerido',
  submitError: 'No se pudo enviar el formulario',
  edit: 'Editar',
  addItem: 'Agregar otro',
  removeItem: (n) => `Quitar elemento ${n}`,
  itemTitle: (n) => `Elemento ${n}`,
  minItems: (n) => `Agregá al menos ${n}`,
  maxItems: (n) => `Máximo ${n} elementos`,
  noResults: 'Sin resultados',
  searching: 'Buscando…',
  dateTo: 'Hasta',
  endBeforeStart: 'La fecha final es anterior a la inicial',
  pay: 'Pagar',
  loadingPayment: 'Cargando el medio de pago…',
  payWith: (name) => `Pagar con ${name}`,
  choosePayment: 'Elegí cómo pagar',
  paying: 'Redirigiendo al pago…',
  paymentFailed: 'No se pudo completar el pago',
  paymentProcessing: 'Registrando el pago…',
  noPaymentPlugin: 'No hay un medio de pago configurado para este paso',
  waiting: 'Esperando confirmación…',
  waitFailed: 'No pudimos confirmar la operación',
  dropFiles: 'Arrastrá archivos acá o',
  chooseFiles: 'elegí desde tu equipo',
  fileUploading: 'Esperá a que terminen de subir los archivos',
  fileTooLarge: (max) => `El archivo supera el máximo de ${max}`,
  fileWrongType: 'Tipo de archivo no permitido',
  tooManyFiles: (max) => `Máximo ${max} archivos`,
  minFiles: (min) => `Subí al menos ${min} archivos`,
  removeFile: (name) => `Quitar ${name}`,
  cancelUpload: (name) => `Cancelar ${name}`,
  retryUpload: (name) => `Reintentar ${name}`,
  uploadFailed: 'No se pudo subir',
  noStorage: 'No hay almacenamiento configurado para este campo',
  acceptTerms: 'Acepto los términos y condiciones',
  readFullTerms: 'Leer el documento completo',
  yes: 'Sí',
  no: 'No',
  retry: 'Reintentar',
  backToForm: 'Volver al formulario',
  submitting: 'Enviando…',
  successMessage: '¡Listo! Recibimos tu información.',
  invalidEmail: 'Email inválido',
  invalidNumber: 'Número inválido',
  invalidPattern: 'Formato inválido',
  invalidUrl: 'URL inválida',
  invalidPhone: 'Teléfono inválido',
  minDate: (date) => `Desde el ${date}`,
  maxDate: (date) => `Hasta el ${date}`,
  mustMatch: 'Los valores no coinciden',
  minLength: (n) => `Mínimo ${n} caracteres`,
  maxLength: (n) => `Máximo ${n} caracteres`,
  minValue: (n) => `Mínimo ${n}`,
  maxValue: (n) => `Máximo ${n}`,
};
