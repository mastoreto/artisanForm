import type { ReactNode } from 'react';
import type { ArtisanFieldWrapperProps } from './types';
import { useComponents, useCx } from './UiContext';

/** `aria-describedby` for an input: the help and error ids that are present. */
export const describedBy = (
  id: string,
  parts: { helperText?: string; error?: string | null },
): string | undefined =>
  [parts.error && `${id}-error`, parts.helperText && `${id}-help`]
    .filter(Boolean)
    .join(' ') || undefined;

/**
 * Wrapper of one field. With a `FieldWrapper` component the wrapper owns the
 * label, description and error (the parts below render nothing then).
 */
export const FieldBox = ({
  id,
  label,
  helperText,
  error,
  errorCode,
  className,
  children,
}: {
  id: string;
  label: string;
  helperText?: string;
  error?: string | null;
  errorCode?: string;
  className?: string;
  children: ReactNode;
}) => {
  const cx = useCx();
  const { FieldWrapper } = useComponents();
  if (FieldWrapper) {
    const props: ArtisanFieldWrapperProps = {
      id,
      label,
      description: helperText,
      error: error
        ? { code: errorCode ?? 'invalid', message: error }
        : undefined,
      invalid: !!error,
      className,
      children,
    };
    return <FieldWrapper {...props} />;
  }
  return (
    <div className={cx('field', className)} data-invalid={!!error || undefined}>
      {children}
    </div>
  );
};

export const FieldLabel = ({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) => {
  const cx = useCx();
  if (useComponents().FieldWrapper) return null;
  return (
    <label htmlFor={htmlFor} className={cx('label')}>
      {children}
    </label>
  );
};

export const FieldHelp = ({ id, text }: { id: string; text?: string }) => {
  const cx = useCx();
  const wrapped = !!useComponents().FieldWrapper;
  return text && !wrapped ? (
    <p className={cx('description')} id={`${id}-help`}>
      {text}
    </p>
  ) : null;
};

export const FieldError = ({
  id,
  error,
}: {
  id: string;
  error?: string | null;
}) => {
  const cx = useCx();
  const wrapped = !!useComponents().FieldWrapper;
  return error && !wrapped ? (
    <p className={cx('error')} id={`${id}-error`} aria-live="polite">
      {error}
    </p>
  ) : null;
};
