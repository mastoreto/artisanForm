import { useMemo } from 'react';
import type { ArtisanLabels } from '../../commons/labels';
import type { ArtisanExtensions } from '../../engine/extensions';
import type { FormValues } from '../../engine/form/types';
import type { PluginsConfig } from '../../integrations/payments/types';
import type {
  StorageAdapter,
  StorageMap,
} from '../../integrations/storage/types';
import type { ConflictDecision, SnapshotConflict } from '../../persistence';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { FormSchema } from '../../schema/legacy/types';
import type { FieldRegistry } from '../fields/registry';
import type { StepRegistry } from '../steps/registry';
import { type ArtisanUiKit, mergeUiLayers } from '../ui/kit';
import type { ArtisanComponents } from '../ui/types';
import { type ArtisanClassNames, UiContext } from '../ui/UiContext';
import { ArtisanWizardProvider, useArtisanWizard } from './useArtisanWizard';
import { Wizard } from './Wizard';

interface ArtisanFormProps {
  /**
   * The form definition: an `ArtisanSchemaV1` (JSON-serializable, see
   * `defineForm`) or a 0.2.0 `FormSchema` (adapted internally).
   */
  scheme: FormSchema | ArtisanSchemaV1;
  /** Local functions and components a v1 schema refers to by id. */
  extensions?: ArtisanExtensions;
  /** Return a promise to keep "Finish" disabled until it settles. */
  onSubmit: (values: FormValues) => unknown;
  /** What to do with a saved draft that does not fit this form (default: `backup`). */
  onSnapshotConflict?: (conflict: SnapshotConflict) => ConflictDecision;
  /** Overrides the scheme defaults for the given field names. */
  initialValues?: FormValues;
  /** Called with the new step index whenever the wizard moves. */
  onStepChange?: (step: number) => void;
  /** Called with all values on every change. */
  onChange?: (values: FormValues) => void;
  /** Drives the wizard to this step when it changes (pair with onStepChange). */
  step?: number;
  /** Overrides any UI text or validation message (default: English). */
  labels?: Partial<ArtisanLabels>;
  /** Extra classes for the <form> element. */
  className?: string;
  /** Saves values and step to localStorage under this key and restores them on mount. Passwords are never saved; the draft is cleared on submit. */
  persistKey?: string;
  /** Custom field types, merged over the built-in ones (see `defaultFieldRegistry`). */
  fields?: FieldRegistry;
  /** Custom step kinds, merged over the built-in ones (see `defaultStepRegistry`). */
  stepTypes?: StepRegistry;
  /** Where file fields upload: one adapter, or a map keyed by the field's `storage`. */
  storage?: StorageAdapter | StorageMap;
  /** Payment plugins (Stripe, Mercado Pago…, or your own) and the redirect function. */
  plugins?: PluginsConfig;
  /** A UI kit (design system adapter). Explicit `components`, `classNames`, `unstyled` and `labels` win over it. */
  kit?: ArtisanUiKit;
  /** Replace parts of the default UI (inputs by type, Stepper, Controls…). See `ArtisanComponents`. */
  components?: ArtisanComponents;
  /** Extra classes per part of the default UI, added to the `af-*` ones. */
  classNames?: ArtisanClassNames;
  /** Do not emit the `af-*` classes: bring your own styles. */
  unstyled?: boolean;
}

/**
 * The ready-made UI: `useArtisanWizard` for the behavior, `Wizard` for the
 * markup, a kit and `components`/`classNames` for the look.
 */
const ArtisanForm = ({
  scheme,
  kit,
  components: componentsProp,
  classNames: classNamesProp,
  unstyled: unstyledProp,
  labels: labelOverrides,
  className,
  ...options
}: ArtisanFormProps) => {
  // default UI < kit < explicit props
  const {
    components,
    classNames,
    unstyled,
    labels: kitLabels,
  } = useMemo(
    () =>
      mergeUiLayers(kit, {
        components: componentsProp,
        classNames: classNamesProp,
        unstyled: unstyledProp,
      }),
    [kit, componentsProp, classNamesProp, unstyledProp],
  );
  const uiConfig = useMemo(
    () => ({ components, classNames, unstyled }),
    [components, classNames, unstyled],
  );
  const labels = useMemo(
    () => ({ ...kitLabels, ...labelOverrides }),
    [kitLabels, labelOverrides],
  );
  const wizard = useArtisanWizard({ schema: scheme, labels, ...options });
  return (
    <ArtisanWizardProvider wizard={wizard}>
      <UiContext.Provider value={uiConfig}>
        <Wizard wizard={wizard} className={className} />
      </UiContext.Provider>
    </ArtisanWizardProvider>
  );
};

export default ArtisanForm;
