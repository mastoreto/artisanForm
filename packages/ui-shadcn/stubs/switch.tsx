import type { ComponentProps } from 'react';
export const Switch = ({
  checked,
  onCheckedChange,
  ...props
}: Omit<ComponentProps<'button'>, 'onChange'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!checked}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  />
);
