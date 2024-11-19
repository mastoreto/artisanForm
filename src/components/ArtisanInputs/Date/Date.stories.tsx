import type { Meta, StoryObj } from '@storybook/react';
import Date from './Date';

interface DateInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const meta: Meta<DateInputProps> = {
  title: 'Controls/Artisan Inputs/Date',
  component: Date,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      defaultValue: 'Label',
    },
    placeholder: {
      control: 'text',
      defaultValue: 'Enter text here',
    },
    value: {
      control: 'text',
      defaultValue: 'Input Text',
    },
  },
};

export default meta;

type Story = StoryObj<DateInputProps>;

export const Default: Story = {
  args: {
    id: 'text-input',
    label: 'Text Input',
    value: 'Input Text',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      console.log(e.target.value),
  },
};
