import { type ComponentProps, createContext, useContext } from 'react';

interface Ctx {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}
const GroupContext = createContext<Ctx>({});

export const RadioGroup = ({
  value,
  onValueChange,
  disabled,
  className = '',
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & Ctx) => (
  <GroupContext.Provider value={{ value, onValueChange, disabled }}>
    <div role="radiogroup" className={`grid gap-2 ${className}`} {...props} />
  </GroupContext.Provider>
);

export const RadioGroupItem = ({
  value,
  className = '',
  ...props
}: Omit<ComponentProps<'button'>, 'value'> & { value: string }) => {
  const group = useContext(GroupContext);
  const checked = group.value === value;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={group.disabled}
      onClick={() => group.onValueChange?.(value)}
      className={`grid aspect-square h-4 w-4 place-content-center rounded-full border border-primary text-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-current" />}
    </button>
  );
};
