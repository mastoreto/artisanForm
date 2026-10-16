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
