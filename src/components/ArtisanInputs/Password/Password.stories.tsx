import type { Meta, StoryObj } from '@storybook/react';
import Password from './Password';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

const meta: Meta<PasswordInputProps> = {
  title: 'Controls/Artisan Inputs/Password',
  component: Password,
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

type Story = StoryObj<PasswordInputProps>;

export const Default: Story = {
  args: {
    id: 'text-input',
    label: 'Text Input',
    value: 'Input Text',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      console.log(e.target.value),
  },
};
