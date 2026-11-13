import type { Meta, StoryObj } from '@storybook/react';
import { describeCapabilities } from '../../schema';
import '../builder.css';
import { FormBuilder } from './FormBuilder';

const meta: Meta<typeof FormBuilder> = {
  title: 'Builder/FormBuilder',
  component: FormBuilder,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof FormBuilder>;

/** Everything on: palette, canvas, inspector, preview, JSON, templates, translations. */
export const Default: Story = {};

/** `mode="simple"` hides advanced and developer settings: for people who are not developers. */
export const SimpleMode: Story = { args: { mode: 'simple' } };

export const AdvancedMode: Story = { args: { mode: 'advanced' } };

/** Nothing can be changed; the form is still previewed and exported. */
export const ReadOnly: Story = {
  args: {
    readOnly: true,
    defaultValue: {
      schemaVersion: 1,
      id: 'contact',
      steps: [
        {
          id: 'main',
          type: 'form',
          title: 'Contact',
          fields: [{ type: 'email', name: 'email', label: 'Email' }],
        },
      ],
    },
  },
};

/** A custom `x-*` type from the manifest is offered in the palette; its settings come from its `config` spec. */
export const CustomType: Story = {
  args: {
    manifest: describeCapabilities({
      customTypes: [
        {
          type: 'x-satisfaction',
          kind: 'field',
          config: {
            type: 'object',
            required: ['max'],
            properties: { max: { type: 'integer', minimum: 1, maximum: 10 } },
          },
        },
      ],
    }),
  },
};

/** Optional modules can be turned off. */
export const FewerFeatures: Story = {
  args: {
    features: { conditions: false, translations: false, templates: false },
  },
};
