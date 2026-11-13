import { isNativeFieldType, isNativeStepType } from '../../schema';
import { useBuilder } from '../context';
import { useBx } from '../cx';
import { FIELD_CATALOG } from '../model/catalog';
import { customFieldProperties } from '../model/custom';
import { getField, getProperty } from '../model/operations';
import {
  fieldProperties,
  formProperties,
  stepProperties,
} from '../model/properties';
import type { Level, PropertyDescriptor, Section } from '../model/types';
import { PropertyControl } from './controls';

const SECTIONS: Section[] = [
  'general',
  'validation',
  'layout',
  'data',
  'flow',
  'advanced',
];

/** The settings of whatever is selected, generated from the catalog's property descriptors. */
export const Inspector = () => {
  const {
    schema,
    selection,
    labels,
    mode,
    actions,
    error,
    pruned,
    readOnly,
    manifest,
    features,
  } = useBuilder();
  const bx = useBx();
  const shown = (level: Level) => mode === 'advanced' || level === 'simple';

  let title = labels.formSettings;
  let props: PropertyDescriptor[] = formProperties();
  if (selection.kind === 'step') {
    const step = schema.steps.find((s) => s.id === selection.stepId);
    if (step) {
      title = labels.stepSettings(step.type);
      props = isNativeStepType(step.type) ? stepProperties(step.type) : [];
    }
  } else if (selection.kind === 'field') {
    const field = getField(schema, selection.stepId, selection.path);
    if (field) {
      title = labels.fieldSettings(
        FIELD_CATALOG[field.type as keyof typeof FIELD_CATALOG]?.label ??
          field.type,
      );
      props = isNativeFieldType(field.type)
        ? fieldProperties(field.type)
        : customFieldProperties(
            manifest?.customTypes?.find(
              (t) => t.type === field.type && t.kind === 'field',
            ),
          );
    }
  }
  const visible = props.filter(
    (d) =>
      shown(d.level) &&
      (features.conditions ||
        (d.control !== 'condition' && d.control !== 'transitions')),
  );
  const message = error ? labels.errors[error] : undefined;

  return (
    <section className={bx('inspector')} aria-label={labels.inspectorTitle}>
      <h2 className={bx('panelTitle')}>{title}</h2>
      {pruned.length > 0 && (
        <p className={bx('notice')} role="status">
          {labels.prunedNotice(pruned.length)}
        </p>
      )}
      <fieldset className={bx('fieldset')} disabled={readOnly}>
        {SECTIONS.map((section) => {
          const list = visible.filter((d) => d.section === section);
          if (list.length === 0) return null;
          return (
            <div key={section} className={bx('section')}>
              <h3 className={bx('sectionTitle')}>{labels.sections[section]}</h3>
              {list.map((d) => (
                <PropertyControl
                  key={`${selection.kind}:${JSON.stringify(selection)}:${d.path}`}
                  descriptor={d}
                  value={getProperty(schema, selection, d.path)}
                  onChange={(next) => actions.setProperty(d.path, next)}
                  error={d.path === 'name' ? message : undefined}
                />
              ))}
            </div>
          );
        })}
      </fieldset>
    </section>
  );
};
