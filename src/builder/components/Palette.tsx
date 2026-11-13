import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import type { CustomTypeSpec } from '../../schema';
import { NATIVE_FIELD_TYPES } from '../../schema';
import type { NativeFieldType } from '../../schema/contract/fields';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import { FIELD_CATALOG, PALETTE_CATEGORIES } from '../model/catalog';

const PaletteItem = ({ type }: { type: NativeFieldType }) => {
  const { labels, actions, readOnly } = useBuilder();
  const bx = useBx();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: 'palette', type },
    disabled: readOnly,
  });
  const entry = FIELD_CATALOG[type];
  return (
    <li>
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className={bx('paletteItem', isDragging && 'afb-dragging')}
        disabled={readOnly}
        aria-label={labels.addToForm(entry.label)}
        data-type={type}
        // Enter or a click adds it; dragging starts after a few pixels (or Space).
        onClick={() => actions.addField(type)}
      >
        {entry.label}
      </button>
    </li>
  );
};

/** A custom (`x-…`) type the app registered: click to add (it is not draggable: it has no catalog entry). */
const CustomItem = ({
  spec,
}: {
  spec: Pick<CustomTypeSpec, 'type' | 'config' | 'description'>;
}) => {
  const { labels, actions, readOnly } = useBuilder();
  const bx = useBx();
  return (
    <li>
      <button
        type="button"
        className={bx('paletteItem')}
        disabled={readOnly}
        data-type={spec.type}
        aria-label={labels.addToForm(spec.type)}
        title={spec.description}
        onClick={() => actions.addCustomField(spec)}
      >
        {spec.type.replace(/^x-/, '')}
      </button>
    </li>
  );
};

/** The inputs a form can be made of, grouped; click or drag one to add it. */
export const Palette = () => {
  const { labels, mode, policy, manifest } = useBuilder();
  const bx = useBx();
  const [query, setQuery] = useState('');
  const allowed = (type: NativeFieldType) => {
    const entry = FIELD_CATALOG[type];
    if (mode === 'simple' && entry.level !== 'simple') return false;
    if (policy && policy !== 'trusted' && policy.nativeFieldTypes)
      return policy.nativeFieldTypes.includes(type);
    return true;
  };
  const q = query.trim().toLowerCase();
  const matches = (type: NativeFieldType) =>
    !q ||
    FIELD_CATALOG[type].label.toLowerCase().includes(q) ||
    type.toLowerCase().includes(q);
  const allowedCustom = (type: string) =>
    !(policy && policy !== 'trusted') ||
    (policy.fieldTypes ?? []).includes(type);
  const specs = new Map(
    (manifest?.customTypes ?? [])
      .filter((t) => t.kind === 'field')
      .map((t) => [t.type, t]),
  );
  const customTypes = (manifest?.fieldTypes ?? [])
    .filter((t) => t.startsWith('x-') && allowedCustom(t))
    .map((t) => specs.get(t) ?? { type: t })
    .filter((s) => !q || s.type.toLowerCase().includes(q));
  return (
    <section className={bx('palette')} aria-label={labels.paletteTitle}>
      <h2 className={bx('panelTitle')}>{labels.paletteTitle}</h2>
      <input
        type="search"
        className={bx('input')}
        placeholder={labels.searchPalette}
        aria-label={labels.searchPalette}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {PALETTE_CATEGORIES.map((category) => {
        const types = NATIVE_FIELD_TYPES.filter(
          (t) =>
            FIELD_CATALOG[t].category === category.id &&
            allowed(t) &&
            matches(t),
        );
        if (types.length === 0) return null;
        return (
          <div key={category.id} className={bx('paletteGroup')}>
            <h3 className={bx('paletteHeading')}>{category.label}</h3>
            <ul className={bx('paletteList')}>
              {types.map((t) => (
                <PaletteItem key={t} type={t} />
              ))}
            </ul>
          </div>
        );
      })}
      {customTypes.length > 0 && (
        <div className={bx('paletteGroup')}>
          <h3 className={bx('paletteHeading')}>{labels.customGroup}</h3>
          <ul className={bx('paletteList')}>
            {customTypes.map((spec) => (
              <CustomItem key={spec.type} spec={spec} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};
