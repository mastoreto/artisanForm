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
  wizard: { title: 'Full wizard', component: Wizard },
  fields: { title: 'Field types', component: Fields },
  repeatables: { title: 'Repeatable fields', component: Repeatables },
  files: { title: 'Files', component: Files },
  payments: { title: 'Payments', component: Payments },
  pending: { title: 'Waiting for confirmation', component: Pending },
};
