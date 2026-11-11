import type { ComponentProps } from 'react';

const base =
  'inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
};

/** shadcn/ui "new-york" button (same class strings as the registry item). */
export const Button = ({
  variant = 'default',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof variants }) => (
  <button className={`${base} ${variants[variant]} ${className}`} {...props} />
);
