import type { ComponentType } from 'react';
import Fields from './Fields';
import Files from './Files';
import Payments from './Payments';
import Pending from './Pending';
import Repeatables from './Repeatables';
import Wizard from './Wizard';

export const scenarios: Record<
  string,
  { title: string; component: ComponentType }
> = {
  wizard: { title: 'Wizard completo', component: Wizard },
  fields: { title: 'Tipos de campo', component: Fields },
  repeatables: { title: 'Campos repetibles', component: Repeatables },
  files: { title: 'Archivos', component: Files },
  payments: { title: 'Pagos', component: Payments },
  pending: { title: 'Espera de confirmación', component: Pending },
};
