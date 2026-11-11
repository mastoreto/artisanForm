import type { ComponentProps } from 'react';

/** Radix-like: a `role="checkbox"` button with `onCheckedChange`. */
export const Checkbox = ({
  checked,
  onCheckedChange,
  className = '',
  ...props
}: Omit<ComponentProps<'button'>, 'onChange'> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={!!checked}
    data-state={checked ? 'checked' : 'unchecked'}
    onClick={() => onCheckedChange?.(!checked)}
    className={`peer grid h-4 w-4 shrink-0 place-content-center rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground ${className}`}
    {...props}
  >
    {checked && (
      <svg
        viewBox="0 0 16 16"
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path
          d="m3 8.5 3.2 3L13 4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);
