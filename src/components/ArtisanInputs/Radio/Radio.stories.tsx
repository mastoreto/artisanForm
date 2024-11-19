import type { Meta, StoryObj } from '@storybook/react';
import Radio from './Radio';

interface Option {
    label: string;
    value: string;
  }
  
  interface RadioProps {
    options: Option[];
  }

const meta: Meta<RadioProps> = {
  title: 'Controls/Artisan Inputs/Radio',
  component: Radio,
  tags: ['autodocs'],
  argTypes: {
    options: {
      control: 'object',
      defaultValue: [
        { value: '1', label: 'Option 1' },
        { value: '2', label: 'Option 2' },
        { value: '3', label: 'Option 3' },
      ],
    },
  },
};

export default meta;

type Story = StoryObj<RadioProps>;

export const Default: Story = {
  args: {
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
    ],
  },
};
