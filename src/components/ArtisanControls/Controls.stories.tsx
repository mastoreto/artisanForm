import Controls from './Controls';
import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useArtisanStore } from '../../stores/useArtisanStore';

interface Args {
  isFinalStep: boolean;
  step: number;
  processStep: number;
}

const meta: Meta<Args & { onNext?: () => void }> = {
  title: 'Controls/Artisan Controls',
  component: Controls,
  tags: ['autodocs'],
  argTypes: {
    isFinalStep: {
      control: 'boolean',
      defaultValue: true,
    },
    step: {
      control: 'number',
      defaultValue: 0,
    },
    processStep: {
      control: 'number',
      defaultValue: 0,
    },
  },
};

export default meta;

type Story = StoryObj<Args>;

export const Default: Story = {
  render: (args: Args) => {
    const isFinalStep = useArtisanStore((state) => state.isFinalStep);
    const setIsFinalStep = useArtisanStore((state) => state.setIsFinalStep);
    const step = useArtisanStore((state) => state.step);
    const processStep = useArtisanStore((state) => state.processStep);

    useEffect(() => {
      setIsFinalStep(args.isFinalStep);
    }, [args.isFinalStep]);

    return <Controls />;
  },
  args: {
    isFinalStep: true,
    step: 0,
    processStep: 0,
  },
};
