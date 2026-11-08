import type { ComponentProps } from 'react';
export const Button = ({
  variant: _variant,
  ...props
}: ComponentProps<'button'> & { variant?: 'default' | 'outline' }) => (
  <button {...props} />
);
