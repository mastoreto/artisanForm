import type { Preview } from '@storybook/react';
import '../src/styles/artisanform.css';
import './storybook.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
  },
};

export default preview;
