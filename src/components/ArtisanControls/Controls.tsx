import React from 'react';
import { cn } from '../../commons/cn';
import { useArtisanStore } from '../../stores/useArtisanStore';

const Controls: React.FC = (): JSX.Element => {
  const isFinalStep = useArtisanStore((state) => state.isFinalStep);
  const step = useArtisanStore((state) => state.step);
  const processStep = useArtisanStore((state) => state.processStep);
  const setStep = useArtisanStore((state) => state.setStep);
  const setProcessStep = useArtisanStore((state) => state.setProcessStep);

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
      'bg-blue-500',
      'text-white',
      'rounded',
      'shadow',
      'hover:bg-blue-700',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-blue-500',
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
    <div className={classes.container}>
      {processStep > 0 && step > 0 && (
        <button
          type="button"
          className={classes.button}
          onClick={() => handlePrevious()}
        >
          Anterior
        </button>
      )}
      {!isFinalStep && (
        <button
          type="button"
          className={classes.button}
          onClick={() => handleNext()}
        >
          Siguiente
        </button>
      )}
      {isFinalStep && (
        <button
          type="submit"
          className={classes.button}
          onClick={() => console.log('Finalizar')}
        >
          Finalizar
        </button>
      )}
    </div>
  );
};

export default Controls;
