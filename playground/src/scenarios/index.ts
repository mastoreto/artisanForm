import type { ComponentType } from 'react';
import Files from './Files';
import Payments from './Payments';
import Pending from './Pending';
import Wizard from './Wizard';

export const scenarios: Record<
  string,
  { title: string; component: ComponentType }
> = {
  wizard: { title: 'Wizard completo', component: Wizard },
  files: { title: 'Archivos', component: Files },
  payments: { title: 'Pagos', component: Payments },
  pending: { title: 'Espera de confirmación', component: Pending },
};
