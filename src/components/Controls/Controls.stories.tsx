import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { useArtisanStore } from '../../engine/store/useArtisanStore';
import Controls from './Controls';

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

const FinalStepControls = (args: Args) => {
  const setIsFinalStep = useArtisanStore((state) => state.setIsFinalStep);

  useEffect(() => {
    setIsFinalStep(args.isFinalStep);
  }, [args.isFinalStep]);

  return <Controls />;
};

export const Default: Story = {
  render: (args: Args) => <FinalStepControls {...args} />,
  args: {
    isFinalStep: true,
    step: 0,
    processStep: 0,
  },
};
