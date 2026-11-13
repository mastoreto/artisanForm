import type { FieldRegistry } from '../components/fields/registry';
import type { StepRegistry } from '../components/steps/registry';
import type { PluginsConfig } from '../integrations/payments/types';
import {
  normalizeStorage,
  type StorageAdapter,
  type StorageMap,
} from '../integrations/storage/types';
import {
  type CapabilitiesManifest,
  type CustomTypeSpec,
  describeCapabilities,
  isNativeFieldType,
  isNativeStepType,
} from '../schema';
import type { ArtisanExtensions } from './extensions';

/** The props of `<ArtisanForm>` that register things a schema can name. */
export interface Registrations {
  extensions?: ArtisanExtensions;
  fields?: FieldRegistry;
  stepTypes?: StepRegistry;
  plugins?: PluginsConfig;
  storage?: StorageAdapter | StorageMap;
}

/** The schema `type` of a registry key: `stars` and `x-stars` are both `x-stars`. */
const schemaType = (key: string) => (key.startsWith('x-') ? key : `x-${key}`);

/**
 * The capabilities manifest of an app, derived from the same props it passes to
 * `<ArtisanForm>`: one source instead of four lists kept by hand. A custom
 * type is described by the optional `spec` of its definition (the shape of its
 * `config`), so a backend can verify a schema's custom elements from the
 * manifest alone. Publish the JSON to your API and give it to the CLI or to
 * `checkSchema` (`manifest`).
 */
export const describeRegistrations = (
  registrations: Registrations = {},
): CapabilitiesManifest => {
  const customTypes: CustomTypeSpec[] = [];
  const names = (
    registry: Record<string, { spec?: CustomTypeSpec }> | undefined,
    native: (key: string) => boolean,
    kind: CustomTypeSpec['kind'],
  ) =>
    Object.entries(registry ?? {})
      .filter(([key]) => !native(key))
      .map(([key, def]) => {
        const type = schemaType(key);
        if (def?.spec) customTypes.push({ ...def.spec, type, kind });
        return type;
      });
  const fieldTypes = names(registrations.fields, isNativeFieldType, 'field');
  const stepKinds = names(registrations.stepTypes, isNativeStepType, 'step');
  return describeCapabilities({
    extensions: registrations.extensions,
    paymentProviders: (registrations.plugins?.payments ?? []).map((p) => p.id),
    storage: Object.keys(normalizeStorage(registrations.storage)),
    fieldTypes,
    stepKinds,
    customTypes,
  });
};
