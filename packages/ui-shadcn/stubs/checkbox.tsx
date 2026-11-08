import type { ComponentProps } from 'react';
// Radix-like: a button with role="checkbox" and onCheckedChange.
export const Checkbox = ({
  checked,
  onCheckedChange,
  ...props
}: Omit<ComponentProps<'button'>, 'onChange'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={!!checked}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  />
);
