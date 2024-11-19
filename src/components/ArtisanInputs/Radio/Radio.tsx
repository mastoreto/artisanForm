import { useState, useImperativeHandle, forwardRef } from 'react';
import { cn } from '../../../commons/cn';

interface Option {
  label: string;
  value: string;
}

interface RadioProps {
  options: Option[];
}

const Radio = forwardRef((props: RadioProps, ref) => {
  const { options } = props;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    reset: () => setSelectedOption(null),
  }));

  const handleChange = (value: string) => {
    setSelectedOption(value);
  };

  return (
    <div className="flex flex-wrap">
      {options.map((option) => (
        <div
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={cn(
            'cursor-pointer select-none m-1 px-4 py-2 border-2 rounded-md transition-colors',
            selectedOption === option.value
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-100'
          )}
        >
          {option.label}
        </div>
      ))}
    </div>
  );
});

export default Radio;
