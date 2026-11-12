import { type ReactNode, useEffect, useRef, useState } from 'react';
import type { ArtisanLabels } from '../../../commons/labels';
import { useArtisanField } from '../../../engine/form/useArtisanField';
import type { FieldOption, FieldSchema } from '../../../schema/legacy/types';
import { useCx } from '../../ui/UiContext';

interface RemoteOptionsProps {
  /** A `select` or `radio` whose options come from `field.loadOptions`. */
  field: FieldSchema;
  /** Renders the field again, now with its options resolved (UI or kit input). */
  render: (field: FieldSchema) => ReactNode;
  labels: ArtisanLabels;
}

type State =
  | { status: 'loading'; options: FieldOption[] }
  | { status: 'ready'; options: FieldOption[] }
  | { status: 'error'; options: FieldOption[] };

/**
 * Loads the options of a `select` or `radio` from its registered source (an
 * empty query returns them all), then renders the field with static options,
 * so the default inputs and any kit see the same thing. It shows the loading
 * and error states like `DynamicSelect` does.
 */
const RemoteOptions = ({ field, render, labels }: RemoteOptionsProps) => {
  const cx = useCx();
  const [binding, , helpers] = useArtisanField<string>(field.name);
  const [state, setState] = useState<State>({ status: 'loading', options: [] });
  const load = field.loadOptions;
  const isSelect = field.type === 'select';
  // The load resolves later: read the value and setter as they are then.
  const latest = useRef({ value: binding.value, setValue: helpers.setValue });
  useEffect(() => {
    latest.current = { value: binding.value, setValue: helpers.setValue };
  });

  useEffect(() => {
    if (!load) return;
    let stale = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async loading state follows the source
    setState({ status: 'loading', options: [] });
    load('')
      .then((options) => {
        if (stale) return;
        setState({ status: 'ready', options });
        // A static select starts on its first option; do the same once they arrive.
        const first = options[0];
        if (isSelect && first && !latest.current.value)
          latest.current.setValue(first.value);
      })
      .catch(() => {
        if (!stale) setState({ status: 'error', options: [] });
      });
    return () => {
      stale = true;
    };
  }, [load, isSelect]);

  return (
    <>
      {render({ ...field, options: state.options, loadOptions: undefined })}
      {state.status === 'loading' && (
        <p className={cx('description')} role="status">
          {labels.loadingOptions}
        </p>
      )}
      {state.status === 'error' && (
        <p className={cx('error')} role="alert">
          {labels.loadOptionsError}
        </p>
      )}
    </>
  );
};

export default RemoteOptions;
