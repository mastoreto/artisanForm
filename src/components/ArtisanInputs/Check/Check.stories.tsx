import type { Meta, StoryObj } from '@storybook/react';
import Check from './Check';

interface Option {
    label: string;
    value: string;
  }
  
  interface CheckProps {
    options: Option[];
  }

const meta: Meta<CheckProps> = {
  title: 'Controls/Artisan Inputs/Check',
  component: Check,
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

type Story = StoryObj<CheckProps>;

export const Default: Story = {
  args: {
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
    ],
  },
};
