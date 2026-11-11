import type { ComponentProps } from 'react';

export const Label = ({
  className = '',
  ...props
}: ComponentProps<'label'>) => (
  <label
    className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
    {...props}
  />
);
