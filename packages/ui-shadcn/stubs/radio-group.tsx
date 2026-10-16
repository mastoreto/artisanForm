import type { ComponentProps } from 'react';
export const RadioGroup = ({
  value: _value,
  onValueChange: _onValueChange,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}) => <div role="radiogroup" {...props} />;
export const RadioGroupItem = ({
  value,
  ...props
}: Omit<ComponentProps<'button'>, 'value'> & { value: string }) => (
  <button type="button" role="radio" data-value={value} {...props} />
);
