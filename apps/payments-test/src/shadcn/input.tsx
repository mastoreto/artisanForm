import type { ComponentProps } from 'react';

export const Input = ({
  className = '',
  ...props
}: ComponentProps<'input'>) => (
  <input
    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive ${className}`}
    {...props}
  />
);
