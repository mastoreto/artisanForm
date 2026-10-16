// Builds the shadcn registry item (r/artisanform-kit.json) from kit.tsx.
// Host the file anywhere static, then: npx shadcn add <url>/artisanform-kit.json
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const content = readFileSync(new URL('../kit.tsx', import.meta.url), 'utf8');
const item = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'artisanform-kit',
  type: 'registry:component',
  title: 'ArtisanForm kit',
  description: 'Renders ArtisanForm wizards with your shadcn/ui components.',
  dependencies: ['artisanform'],
  registryDependencies: [
    'button',
    'checkbox',
    'input',
    'label',
    'radio-group',
    'switch',
    'textarea',
  ],
  files: [
    {
      path: 'kit.tsx',
      type: 'registry:component',
      target: 'components/artisanform-kit.tsx',
      content,
    },
  ],
};
const out = new URL('../r/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(
  new URL('artisanform-kit.json', out),
  `${JSON.stringify(item, null, 2)}\n`,
);
console.log('wrote packages/ui-shadcn/r/artisanform-kit.json');
