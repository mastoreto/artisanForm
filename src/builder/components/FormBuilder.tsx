import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { Registrations } from '../../engine/registrations';
import type {
  CapabilitiesManifest,
  SchemaLimits,
  SchemaPolicy,
} from '../../schema';
import type { ArtisanSchemaV1 } from '../../schema/contract/define';
import type { NativeFieldType } from '../../schema/contract/fields';
import {
  ALL_FEATURES,
  BuilderContext,
  type BuilderContextValue,
  type BuilderFeatures,
  type BuilderMode,
  useBuilder,
} from '../context';
import { type BuilderUi, BuilderUiContext, useBx } from '../cx';
import { type BuilderLabels, defaultBuilderLabels } from '../labels';
import { FIELD_CATALOG } from '../model/catalog';
import { type BuilderTemplate, defaultTemplates } from '../templates';
import { type BuilderResult, useFormBuilder } from '../useFormBuilder';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { Compatibility, Issues } from './Issues';
import { Palette } from './Palette';
import { JsonPanel, TemplatesPanel, TranslationsPanel } from './Panels';
import { Preview } from './Preview';
import { type Panel, type SavePayload, Toolbar } from './Toolbar';

export interface FormBuilderProps extends BuilderUi {
  /** Controlled: the schema being edited. */
  value?: ArtisanSchemaV1;
  /** Uncontrolled: the schema to start from. */
  defaultValue?: ArtisanSchemaV1;
  onChange?: (result: BuilderResult) => void;
  onSave?: (payload: SavePayload) => void;
  /** What the front end can run (from `describeRegistrations`); or pass `registrations`. */
  manifest?: CapabilitiesManifest;
  registrations?: Registrations;
  policy?: 'trusted' | SchemaPolicy;
  limits?: SchemaLimits;
  /** The published schema: edits are compared with it to warn about changes that break earlier answers. */
  baseline?: ArtisanSchemaV1;
  /** `simple` hides advanced and developer settings and inputs. */
  mode?: BuilderMode;
  onModeChange?: (mode: BuilderMode) => void;
  readOnly?: boolean;
  features?: BuilderFeatures;
  labels?: Partial<BuilderLabels>;
  /** Props for the live preview's `<ArtisanForm>` (kit, extensions, locale…). */
  previewProps?: Record<string, unknown>;
  /** Starting points of the gallery (default: a few starter forms). */
  templates?: BuilderTemplate[];
  className?: string;
  children?: ReactNode;
}

/** Drag and drop between the palette and the lists of fields. */
const Dnd = ({ children }: { children: ReactNode }) => {
  const { schema, labels, actions } = useBuilder();
  const [active, setActive] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );
  const nameOf = (id: string): string => {
    const data = id.split(':');
    if (data[0] === 'palette')
      return FIELD_CATALOG[data[1] as NativeFieldType]?.label ?? data[1] ?? '';
    return data[2] ?? '';
  };
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActive(null);
    const from = a.data.current as
      | {
          kind: string;
          type?: NativeFieldType;
          stepId?: string;
          path?: number[];
        }
      | undefined;
    const to = over?.data.current as
      | { kind: string; stepId: string; path?: number[]; parent?: number[] }
      | undefined;
    if (!from || !to) return;
    const target =
      to.kind === 'list'
        ? {
            stepId: to.stepId,
            parent: to.parent ?? [],
            index: undefined as number | undefined,
          }
        : {
            stepId: to.stepId,
            parent: (to.path ?? []).slice(0, -1),
            index: (to.path ?? []).at(-1),
          };
    if (from.kind === 'palette' && from.type)
      actions.addField(from.type, target);
    else if (from.kind === 'field' && from.stepId && from.path)
      actions.moveField(
        { stepId: from.stepId, path: from.path },
        {
          stepId: target.stepId,
          parent: target.parent,
          index: target.index ?? Number.MAX_SAFE_INTEGER,
        },
      );
  };
  void schema;
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActive(String(e.active.id))}
      onDragCancel={() => setActive(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active: a }) =>
            labels.announceGrab(nameOf(String(a.id))),
          onDragOver: ({ active: a }) =>
            labels.announceMove(nameOf(String(a.id)), 0),
          onDragEnd: ({ active: a }) =>
            labels.announceDrop(nameOf(String(a.id)), 0),
          onDragCancel: ({ active: a }) =>
            labels.announceCancel(nameOf(String(a.id))),
        },
      }}
    >
      {children}
      <DragOverlay>
        {active ? <div className="afb-overlay">{nameOf(active)}</div> : null}
      </DragOverlay>
    </DndContext>
  );
};

/** Gives the builder parts their state. Use it to compose your own layout. */
export const FormBuilderProvider = ({
  children,
  mode = 'simple',
  readOnly = false,
  features,
  labels,
  previewProps,
  classNames,
  unstyled,
  policy,
  templates,
  ...options
}: Omit<FormBuilderProps, 'onSave' | 'onModeChange' | 'className'>) => {
  const builder = useFormBuilder({ ...options, policy });
  const [previewLocale, setPreviewLocale] = useState<string | undefined>();
  const value = useMemo<BuilderContextValue>(
    () => ({
      ...builder,
      labels: { ...defaultBuilderLabels, ...labels },
      mode,
      readOnly,
      features: { ...ALL_FEATURES, ...features },
      policy,
      previewProps: previewProps ?? {},
      previewLocale,
      setPreviewLocale,
      templates: templates ?? defaultTemplates,
    }),
    [
      builder,
      labels,
      mode,
      readOnly,
      features,
      policy,
      previewProps,
      previewLocale,
      templates,
    ],
  );
  return (
    <BuilderUiContext.Provider value={{ classNames, unstyled }}>
      <BuilderContext.Provider value={value}>
        <Dnd>{children}</Dnd>
      </BuilderContext.Provider>
    </BuilderUiContext.Provider>
  );
};

const Layout = ({
  onSave,
  onModeChange,
  className,
}: Pick<FormBuilderProps, 'onSave' | 'onModeChange' | 'className'>) => {
  const { features } = useBuilder();
  const bx = useBx();
  const [panel, setPanel] = useState<Panel | undefined>();
  return (
    <div className={bx('root', className)}>
      <Toolbar
        onSave={onSave}
        onModeChange={onModeChange}
        panel={panel}
        onPanel={setPanel}
      />
      <Compatibility />
      <div className={bx('body', features.preview && 'afb-with-preview')}>
        <Palette />
        <Canvas />
        <Inspector />
        {features.preview && <Preview />}
      </div>
      {panel === 'templates' && features.templates && <TemplatesPanel />}
      {panel === 'translations' && features.translations && (
        <TranslationsPanel />
      )}
      {panel === 'json' && <JsonPanel />}
      <Issues />
    </div>
  );
};

/**
 * The whole visual builder: palette, canvas, inspector and live preview. Import
 * `artisanform/builder.css` once (and `artisanform/style.css`, which the preview
 * needs).
 */
export const FormBuilder = ({
  onSave,
  onModeChange,
  className,
  children,
  ...props
}: FormBuilderProps) => (
  <FormBuilderProvider {...props}>
    <Layout onSave={onSave} onModeChange={onModeChange} className={className} />
    {children}
  </FormBuilderProvider>
);
