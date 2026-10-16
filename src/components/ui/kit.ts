import type { ArtisanLabels } from '../../commons/labels';
import type { ArtisanComponents } from './types';
import type { ArtisanClassNames } from './UiContext';

/**
 * A reusable bundle of UI customizations (a design system adapter): the same
 * pieces the `components`, `classNames`, `unstyled` and `labels` props take.
 * Kits live outside the core, so it never depends on a UI library.
 */
export interface ArtisanUiKit {
  /** Shown in warnings and tools; not used for lookup. */
  name: string;
  components?: ArtisanComponents;
  classNames?: ArtisanClassNames;
  unstyled?: boolean;
  labels?: Partial<ArtisanLabels>;
}

/** Identity helper: gives a kit its type without a manual annotation. */
export const defineUiKit = <T extends ArtisanUiKit>(kit: T): T => kit;

type Layer = Omit<ArtisanUiKit, 'name'>;

/**
 * Merges layers left to right; later layers win. `components.inputs` merges
 * per field type, `classNames` and `labels` per key.
 */
export const mergeUiLayers = (...layers: (Layer | undefined)[]): Layer => {
  const out: Layer = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.components)
      out.components = {
        ...out.components,
        ...layer.components,
        inputs: { ...out.components?.inputs, ...layer.components.inputs },
      };
    if (layer.classNames)
      out.classNames = { ...out.classNames, ...layer.classNames };
    if (layer.labels) out.labels = { ...out.labels, ...layer.labels };
    if (layer.unstyled !== undefined) out.unstyled = layer.unstyled;
  }
  return out;
};

/** Merges several kits into one (later kits win). */
export const mergeUiKits = (
  name: string,
  ...kits: ArtisanUiKit[]
): ArtisanUiKit => ({ name, ...mergeUiLayers(...kits) });
