/**
 * Every text of the builder, in English. Override any of them with the
 * `labels` prop (a partial object) to translate the builder or change wording.
 * Functions take the numbers or names they mention.
 */
export interface BuilderLabels {
  undo: string;
  redo: string;
  save: string;
  exportJson: string;
  copied: string;
  valid: string;
  problems: (n: number) => string;
  modeSimple: string;
  modeAdvanced: string;
  paletteTitle: string;
  searchPalette: string;
  addToForm: (type: string) => string;
  canvasTitle: string;
  emptyStep: string;
  stepsLabel: string;
  addStep: string;
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  moveToStep: string;
  duplicate: string;
  remove: string;
  dragHandle: (name: string) => string;
  rowsOf: (name: string) => string;
  stepPage: (n: number, title: string) => string;
  inspectorTitle: string;
  nothingSelected: string;
  formSettings: string;
  stepSettings: (type: string) => string;
  fieldSettings: (type: string) => string;
  sections: Record<
    'general' | 'validation' | 'layout' | 'data' | 'flow' | 'advanced',
    string
  >;
  noValue: string;
  addOption: string;
  removeOption: string;
  optionValue: string;
  optionLabel: string;
  pasteOptions: string;
  pasteOptionsHelp: string;
  applyOptions: string;
  invalidJson: string;
  previewTitle: string;
  previewMobile: string;
  previewTablet: string;
  previewDesktop: string;
  previewLight: string;
  previewDark: string;
  prunedNotice: (n: number) => string;
  errors: Record<
    'not-found' | 'not-allowed' | 'invalid-name' | 'duplicate-name',
    string
  >;
  announceGrab: (name: string) => string;
  announceMove: (name: string, position: number) => string;
  announceDrop: (name: string, position: number) => string;
  announceCancel: (name: string) => string;
  issuesTitle: (errors: number, warnings: number) => string;
  noIssues: string;
  goToIssue: (path: string) => string;
  compatTitle: string;
  compatBreaking: (names: string) => string;
  compatRemoved: (names: string) => string;
  compatRequired: (names: string) => string;
  compatOptions: (names: string) => string;
  customGroup: string;
  condEmpty: string;
  condMatch: string;
  condAll: string;
  condAny: string;
  condNot: string;
  condAdd: string;
  condAddGroup: string;
  condRemove: string;
  condNoAnswers: string;
  condAnswer: string;
  condOperator: string;
  condValue: string;
  condListHelp: string;
  operators: Record<
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'notIn'
    | 'filled'
    | 'empty',
    string
  >;
  transAdd: string;
  transTo: string;
  transWhen: string;
  transAlways: string;
  transRemove: string;
  actionsAdd: string;
  actionLabel: string;
  actionHref: string;
  actionAction: string;
  flowTitle: string;
  flowEnd: string;
  panelTemplates: string;
  panelTranslations: string;
  panelJson: string;
  closePanel: string;
  templatesTitle: string;
  useTemplate: (title: string) => string;
  confirmReplace: string;
  jsonTitle: string;
  applyJson: string;
  loadFile: string;
  downloadJson: string;
  importedNotes: (n: number) => string;
  importedLegacy: string;
  jsonRefused: string;
  transTitle: string;
  addLanguage: string;
  languageTag: string;
  sourceLanguage: string;
  noLanguages: string;
  removeLanguage: (tag: string) => string;
  previewInLanguage: string;
  translatedCount: (done: number, total: number) => string;
  transMissing: string;
  transBadPlaceholders: string;
  transPlural: string;
  transOrphans: (n: number) => string;
  invalidLanguage: string;
  languageExists: string;
}

export const defaultBuilderLabels: BuilderLabels = {
  undo: 'Undo',
  redo: 'Redo',
  save: 'Save',
  exportJson: 'Copy JSON',
  copied: 'Copied',
  valid: 'Valid',
  problems: (n) => `${n} ${n === 1 ? 'problem' : 'problems'}`,
  modeSimple: 'Simple',
  modeAdvanced: 'Advanced',
  paletteTitle: 'Inputs',
  searchPalette: 'Search inputs',
  addToForm: (type) => `Add ${type}`,
  canvasTitle: 'Form',
  emptyStep: 'Drag an input here, or click one on the left to add it.',
  stepsLabel: 'Steps',
  addStep: 'Add step',
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveLeft: 'Move step left',
  moveRight: 'Move step right',
  moveToStep: 'Move to step',
  duplicate: 'Duplicate',
  remove: 'Remove',
  dragHandle: (name) => `Drag ${name}`,
  rowsOf: (name) => `Fields of ${name}`,
  stepPage: (n, title) => `Step ${n}: ${title}`,
  inspectorTitle: 'Settings',
  nothingSelected: 'Select the form, a step or an input to edit it.',
  formSettings: 'Form',
  stepSettings: (type) => `Step (${type})`,
  fieldSettings: (type) => `Input (${type})`,
  sections: {
    general: 'General',
    validation: 'Rules',
    layout: 'Layout',
    data: 'Data',
    flow: 'Logic',
    advanced: 'Advanced',
  },
  noValue: 'None',
  addOption: 'Add option',
  removeOption: 'Remove option',
  optionValue: 'Value',
  optionLabel: 'Label',
  pasteOptions: 'Paste a list',
  pasteOptionsHelp: 'One option per line, as "value, label" or just the label.',
  applyOptions: 'Replace options',
  invalidJson: 'This is not valid JSON',
  previewTitle: 'Preview',
  previewMobile: 'Phone',
  previewTablet: 'Tablet',
  previewDesktop: 'Desktop',
  previewLight: 'Light',
  previewDark: 'Dark',
  prunedNotice: (n) =>
    `${n} ${n === 1 ? 'condition' : 'conditions'} that used it ${n === 1 ? 'was' : 'were'} removed`,
  errors: {
    'not-found': 'That element no longer exists',
    'not-allowed': 'That is not allowed here',
    'invalid-name': 'This name is not valid',
    'duplicate-name': 'Another input already uses this name',
  },
  announceGrab: (name) => `Picked up ${name}`,
  announceMove: (name, position) => `${name} is now at position ${position}`,
  announceDrop: (name, position) => `${name} dropped at position ${position}`,
  announceCancel: (name) => `Moving ${name} was cancelled`,
  issuesTitle: (e, w) =>
    `${e} ${e === 1 ? 'error' : 'errors'}, ${w} ${w === 1 ? 'warning' : 'warnings'}`,
  noIssues: 'Nothing to fix.',
  goToIssue: (path) => `Go to ${path}`,
  compatTitle: 'Compared with the published form',
  compatBreaking: (n) =>
    `Changing the type of ${n} would make earlier answers unreadable.`,
  compatRemoved: (n) => `Removed: ${n}.`,
  compatRequired: (n) => `Now required (earlier answers may be empty): ${n}.`,
  compatOptions: (n) => `Options removed from: ${n}.`,
  customGroup: 'Custom',
  condEmpty: 'Always shown',
  condMatch: 'Match',
  condAll: 'all of these',
  condAny: 'any of these',
  condNot: 'Not',
  condAdd: 'Add condition',
  condAddGroup: 'Add group',
  condRemove: 'Remove condition',
  condNoAnswers: 'Add an input before this one to use its answer here.',
  condAnswer: 'Answer',
  condOperator: 'Is',
  condValue: 'Value',
  condListHelp: 'Separate values with commas',
  operators: {
    eq: 'equal to',
    neq: 'not equal to',
    gt: 'greater than',
    gte: 'at least',
    lt: 'less than',
    lte: 'at most',
    in: 'one of',
    notIn: 'none of',
    filled: 'filled in',
    empty: 'empty',
  },
  transAdd: 'Add next step',
  transTo: 'Go to',
  transWhen: 'When',
  transAlways: 'Always',
  transRemove: 'Remove next step',
  actionsAdd: 'Add button',
  actionLabel: 'Button text',
  actionHref: 'Link',
  actionAction: 'Action',
  flowTitle: 'Flow',
  flowEnd: 'ends here',
  panelTemplates: 'Templates',
  panelTranslations: 'Translations',
  panelJson: 'JSON',
  closePanel: 'Close',
  templatesTitle: 'Start from a template',
  useTemplate: (title) => `Use ${title}`,
  confirmReplace: 'This replaces the current form. Click again to confirm.',
  jsonTitle: 'Schema JSON',
  applyJson: 'Apply',
  loadFile: 'Load a file',
  downloadJson: 'Download',
  importedNotes: (n) =>
    `Imported. ${n} ${n === 1 ? 'thing was' : 'things were'} not carried over exactly.`,
  importedLegacy: 'An older schema was converted to the current format.',
  jsonRefused: 'This is not a schema the builder can open:',
  transTitle: 'Translations',
  addLanguage: 'Add language',
  languageTag: 'Language (es, es-AR…)',
  sourceLanguage: 'Language of the form',
  noLanguages: 'No translations yet. Add a language to start.',
  removeLanguage: (tag) => `Remove ${tag}`,
  previewInLanguage: 'Preview in this language',
  translatedCount: (done, total) => `${done} of ${total} translated`,
  transMissing: 'Missing',
  transBadPlaceholders: 'Placeholders do not match',
  transPlural: 'Plural forms (edit the JSON)',
  transOrphans: (n) =>
    `${n} ${n === 1 ? 'translation points' : 'translations point'} at a text that no longer exists`,
  invalidLanguage: 'This is not a language tag',
  languageExists: 'This language already exists',
};
