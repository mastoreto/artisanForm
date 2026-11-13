/**
 * `artisanform/builder`: a visual form builder. This first part is the model:
 * pure functions over a v1 schema (no React), the catalog of field and step
 * types with the properties an inspector edits, and undo/redo.
 */

export { Canvas } from './components/Canvas';
export { Flow } from './components/Flow';
export {
  FormBuilder,
  type FormBuilderProps,
  FormBuilderProvider,
} from './components/FormBuilder';
export { Inspector } from './components/Inspector';
export { Compatibility, Issues } from './components/Issues';
export { Palette } from './components/Palette';
export {
  JsonPanel,
  TemplatesPanel,
  TranslationsPanel,
} from './components/Panels';
export { Preview } from './components/Preview';
export { type SavePayload, Toolbar } from './components/Toolbar';
export {
  type BuilderFeatures,
  type BuilderMode,
  useBuilder,
} from './context';
export type { BuilderUi } from './cx';
export { type BuilderLabels, defaultBuilderLabels } from './labels';
export type { FieldEntry, StepEntry } from './model/catalog';
export {
  FIELD_CATALOG,
  isContentType,
  PALETTE_CATEGORIES,
  STEP_CATALOG,
} from './model/catalog';
export {
  type BuilderState,
  type CommitOptions,
  canRedo,
  canUndo,
  commit,
  createBuilderState,
  HISTORY_LIMIT,
  redo,
  select,
  undo,
} from './model/history';
export {
  claimedNames,
  pickName,
  toName,
  uniqueName,
  uniqueStepId,
} from './model/names';
export {
  addField,
  addStep,
  duplicateField,
  duplicateStep,
  getField,
  getProperty,
  moveField,
  moveStep,
  referencesTo,
  removeField,
  removeStep,
  renameField,
  renameStep,
  setProperty,
} from './model/operations';
export {
  fieldProperties,
  stepProperties,
  validationFor,
} from './model/properties';
export { pathToSelection, selectionExists } from './model/selection';
export type {
  Change,
  Control,
  DefaultsContext,
  Level,
  PaletteCategory,
  PropertyDescriptor,
  Section,
  Selection,
} from './model/types';
export {
  type BuilderResult,
  emptySchema,
  type FormBuilder as FormBuilderState,
  type UseFormBuilderOptions,
  useFormBuilder,
} from './useFormBuilder';
