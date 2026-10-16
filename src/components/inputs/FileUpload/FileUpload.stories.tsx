import type { Meta, StoryObj } from '@storybook/react';
import { withForm } from '../../../../.storybook/withForm';
import { mockStorage } from '../../../integrations/storage/mock';
import FileUpload from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Controls/Artisan Inputs/File Upload',
  component: FileUpload,
  tags: ['autodocs'],
  args: {
    id: 'upload',
    name: 'files',
    label: 'Documents',
    storage: mockStorage({ delay: 1200 }),
  },
};

export default meta;

type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  decorators: [withForm({ files: [] })],
};

export const MultipleImages: Story = {
  args: { maxFiles: 4, accept: 'image/*', preview: true },
  decorators: [withForm({ files: [] })],
};

export const Disabled: Story = {
  args: { disabled: true },
  decorators: [withForm({ files: [] })],
};
