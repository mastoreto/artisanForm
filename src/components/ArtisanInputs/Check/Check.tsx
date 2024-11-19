import { useState, useImperativeHandle, forwardRef } from 'react';
import { cn } from '../../../commons/cn';

interface Option {
  label: string;
  value: string;
}

interface CheckProps {
  options: Option[];
}

const Check = forwardRef((props: CheckProps, ref) => {
  const { options } = props;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    reset: () => setSelectedOptions([]),
  }));

  const handleChange = (value: string) => {
    setSelectedOptions((prevSelected) =>
      prevSelected.includes(value)
        ? prevSelected.filter((item) => item !== value)
        : [...prevSelected, value]
    );
  };

  return (
    <div className="flex flex-wrap">
      {options.map((option) => (
        <div
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={cn(
            'cursor-pointer select-none m-1 px-4 py-2 border-2 rounded-md transition-colors',
            selectedOptions.includes(option.value)
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

export default Check;