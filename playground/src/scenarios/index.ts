import type { ComponentType } from 'react';
import Files from './Files';
import Wizard from './Wizard';

export const scenarios: Record<
  string,
  { title: string; component: ComponentType }
> = {
  wizard: { title: 'Wizard completo', component: Wizard },
  files: { title: 'Archivos', component: Files },
};
