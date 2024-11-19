import type { Meta, StoryObj } from '@storybook/react';
import Select from './DynamicSelect';

interface SelectProps {
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  value: string;
}

const meta: Meta<SelectProps> = {
  title: 'Controls/Artisan Inputs/Dynamic Select',
  component: Select,
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
    value: {
      control: 'text',
      defaultValue: '1',
    },
  },
};

export default meta;

type Story = StoryObj<SelectProps>;

export const Default: Story = {
  args: {
    options: [
      { value: '1', label: 'Option 1' },
      { value: '2', label: 'Option 2' },
      { value: '3', label: 'Option 3' },
    ],
    value: '1',
    onChange: (value: string) => console.log(value),
  },
};
