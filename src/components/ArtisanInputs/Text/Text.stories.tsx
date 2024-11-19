import type { Meta, StoryObj } from '@storybook/react';
import Text from './Text';

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const meta: Meta<TextInputProps> = {
  title: 'Controls/Artisan Inputs/Text',
  component: Text,
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

type Story = StoryObj<TextInputProps>;

export const Default: Story = {
  args: {
    id: 'text-input',
    label: 'Text Input',
    value: 'Input Text',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      console.log(e.target.value),
  },
};
