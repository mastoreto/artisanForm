import type { ComponentType } from 'react';
import Custom from './Custom';
import Extensions from './Extensions';
import Fields from './Fields';
import Files from './Files';
import Kits from './Kits';
import Layout from './Layout';
import Mui from './Mui';
import Payments from './Payments';
import Pending from './Pending';
import Perf from './Perf';
import Repeatables from './Repeatables';
import Styles from './Styles';
import Tailwind from './Tailwind';
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
  layout: { title: 'Semantic layout', component: Layout },
  custom: { title: 'Custom components', component: Custom },
  extensions: { title: 'Extensions + JSON', component: Extensions },
  styles: { title: 'Three ways to style', component: Styles },
  tailwind: { title: 'UI kits (Tailwind)', component: Tailwind },
  mui: { title: 'UI kits (Material UI)', component: Mui },
  perf: { title: 'Performance (synthetic)', component: Perf },
  kits: { title: 'UI kits (Bootstrap)', component: Kits },
};
