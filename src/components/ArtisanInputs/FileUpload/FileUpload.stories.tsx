import type { Meta, StoryObj } from '@storybook/react';
import { withFormik } from '../../../../.storybook/withFormik';
import { mockStorage } from '../../../storage/mock';
import FileUpload from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'Controls/Artisan Inputs/File Upload',
  component: FileUpload,
  tags: ['autodocs'],
  args: {
    id: 'upload',
    name: 'files',
    label: 'Documentos',
    storage: mockStorage({ delay: 1200 }),
  },
};

export default meta;

type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  decorators: [withFormik({ files: [] })],
};

export const MultipleImages: Story = {
  args: { maxFiles: 4, accept: 'image/*', preview: true },
  decorators: [withFormik({ files: [] })],
};

export const Disabled: Story = {
  args: { disabled: true },
  decorators: [withFormik({ files: [] })],
};
