/** Every user-visible text of the library; override any of them via `labels`. */
export interface ArtisanLabels {
  previous: string;
  next: string;
  submit: string;
  progress: string;
  step: (n: number, total: number, title: string) => string;
  stepItem: (n: number) => string;
  required: string;
  invalidEmail: string;
  invalidNumber: string;
  invalidPattern: string;
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
  required: 'Campo requerido',
  invalidEmail: 'Email inválido',
  invalidNumber: 'Número inválido',
  invalidPattern: 'Formato inválido',
  mustMatch: 'Los valores no coinciden',
  minLength: (n) => `Mínimo ${n} caracteres`,
  maxLength: (n) => `Máximo ${n} caracteres`,
  minValue: (n) => `Mínimo ${n}`,
  maxValue: (n) => `Máximo ${n}`,
};
