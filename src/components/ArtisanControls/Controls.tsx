import React from 'react';
import { cn } from '../../commons/cn';
import { theme } from '../../commons/theme';
import { defaultLabels, type ArtisanLabels } from '../../commons/labels';
import { useArtisanStore } from '../../stores/useArtisanStore';

interface ControlsProps {
  /** Overrides the default advance (e.g. to validate the step first). */
  onNext?: () => void;
  /** Disables "Finalizar" while a submit is in flight. */
  isSubmitting?: boolean;
  labels?: Partial<Pick<ArtisanLabels, 'previous' | 'next' | 'submit'>>;
  /** Extra classes for the container / for every button. */
  className?: string;
  buttonClassName?: string;
}

const Controls = ({
  onNext,
  isSubmitting,
  labels,
  className,
  buttonClassName,
}: ControlsProps): JSX.Element => {
  const isFinalStep = useArtisanStore((state) => state.isFinalStep);
  const step = useArtisanStore((state) => state.step);
  const processStep = useArtisanStore((state) => state.processStep);
  const setStep = useArtisanStore((state) => state.setStep);
  const setProcessStep = useArtisanStore((state) => state.setProcessStep);

  const text = { ...defaultLabels, ...labels };

  const classes = {
    container: cn(
      'flex',
      'flex-row',
      'justify-between',
      'items-center',
      'w-full',
      'h-full',
      'p-4',
      'bg-gray-100',
    ),
    button: cn(
      'px-4',
      'py-2',
      theme.bg,
      'text-white',
      'rounded',
      'shadow',
      theme.bgHover,
      'focus:outline-none',
      'focus:ring-2',
      theme.focusRing,
      'focus:ring-opacity-75',
    ),
  };

  const handleNext = () => {
    setStep(step + 1);
    setProcessStep(processStep + 1);
  };

  const handlePrevious = () => {
    setStep(step - 1);
    setProcessStep(processStep - 1);
  };

  return (
    <div className={cn(classes.container, className)}>
      {processStep > 0 && step > 0 && (
        <button
          type="button"
          className={cn(classes.button, buttonClassName)}
          onClick={() => handlePrevious()}
        >
          {text.previous}
        </button>
      )}
      {!isFinalStep && (
        <button
          type="button"
          className={cn(classes.button, buttonClassName)}
          onClick={() => (onNext ?? handleNext)()}
        >
          {text.next}
        </button>
      )}
      {isFinalStep && (
        <button
          type="submit"
          className={cn(classes.button, buttonClassName)}
          disabled={isSubmitting}
        >
          {text.submit}
        </button>
      )}
    </div>
  );
};

export default Controls;
