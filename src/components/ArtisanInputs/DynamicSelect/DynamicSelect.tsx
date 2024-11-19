import { forwardRef, useState } from 'react';

interface SelectProps {
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  value: string;
}

const DynamicSelectWithDependent = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, onChange, value }, ref) => {
    const [dependentOptions, setDependentOptions] = useState<
      { value: string; label: string }[]
    >([
        { value: 'dependent1', label: 'Dependent 1' },
        { value: 'dependent2', label: 'Dependent 2' },
    ]);
    const [dependentValue, setDependentValue] = useState<string>('');

    const handleFirstSelectChange = (selectedValue: string) => {
      onChange(selectedValue);
      // Update dependentOptions based on the selected value of the first select
      const updatedOptions = getDependentOptions(selectedValue);
      setDependentOptions(updatedOptions);
      setDependentValue(
        updatedOptions.length > 0 ? updatedOptions[0].value : '',
      );
    };

    const handleSecondSelectChange = (selectedValue: string) => {
      setDependentValue(selectedValue);
    };

    const getDependentOptions = (selectedValue: string) => {
      // Logic to get dependent options based on the selected value of the first select
      // This is just a placeholder, replace it with your actual logic
      if (selectedValue === 'option1') {
        return [
          { value: 'dependent1', label: 'Dependent 1' },
          { value: 'dependent2', label: 'Dependent 2' },
        ];
      } else if (selectedValue === 'option2') {
        return [
          { value: 'dependent3', label: 'Dependent 3' },
          { value: 'dependent4', label: 'Dependent 4' },
        ];
      }
      return [];
    };

    return (
      <div>
        <div className="relative inline-block w-full">
          <select
            className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline transition ease-in-out duration-150"
            value={value}
            onChange={(e) => handleFirstSelectChange(e.target.value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg
              className="fill-current h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
            >
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </div>
        </div>
        {dependentOptions.length > 0 && (
          <div className="relative inline-block w-full mt-4">
            <select
              className="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline transition ease-in-out duration-150"
              value={dependentValue}
              onChange={(e) => handleSecondSelectChange(e.target.value)}
            >
              {dependentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default DynamicSelectWithDependent;
