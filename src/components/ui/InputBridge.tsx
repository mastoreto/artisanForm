import { createElement, type ElementType } from 'react';
import { useArtisanField } from '../../engine/form/useArtisanField';
import type { FieldSchema } from '../../schema/legacy/types';
import { FieldBox } from './FieldParts';
import type { ArtisanInputProps } from './types';

/**
 * Connects a replacement input to the form: it reads the value and error
 * through `useArtisanField` and hands the component a neutral contract (see
 * `ArtisanInputProps`), so a third-party control never meets the form engine.
 */
const InputBridge = ({
  Component,
  field,
}: {
  Component: ElementType;
  field: FieldSchema;
}) => {
  const id = field.name;
  const [binding, meta, helpers] = useArtisanField<unknown>(field.name);
  const descriptionId = field.helperText ? `${id}-help` : undefined;
  const errorId = meta.error ? `${id}-error` : undefined;
  const describedBy =
    [errorId, descriptionId].filter(Boolean).join(' ') || undefined;
  const props: ArtisanInputProps<unknown> = {
    id,
    name: field.name,
    value: binding.value,
    onChange: (value) => helpers.setValue(value),
    onBlur: binding.onBlur,
    disabled: field.disabled,
    readOnly: field.readOnly,
    required: field.required,
    label: field.label,
    description: field.helperText,
    placeholder: field.placeholder,
    options: field.options,
    error: meta.error
      ? { code: meta.code ?? 'invalid', message: meta.error }
      : undefined,
    aria: { 'aria-invalid': !!meta.error, 'aria-describedby': describedBy },
    descriptionId,
    errorId,
    field,
  };
  return (
    <FieldBox
      id={id}
      label={field.label}
      helperText={field.helperText}
      error={meta.error}
      errorCode={meta.code}
    >
      {createElement(Component, props)}
    </FieldBox>
  );
};

export default InputBridge;
