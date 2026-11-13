import { createContext, useContext } from 'react';
import type { SchemaPolicy } from '../schema';
import type { BuilderLabels } from './labels';
import type { FormBuilder } from './useFormBuilder';

export type BuilderMode = 'simple' | 'advanced';

/** Parts of the builder that can be turned off. All are on by default. */
export interface BuilderFeatures {
  conditions?: boolean;
  steps?: boolean;
  translations?: boolean;
  templates?: boolean;
  import?: boolean;
  json?: boolean;
  preview?: boolean;
}

export interface BuilderContextValue extends FormBuilder {
  labels: BuilderLabels;
  mode: BuilderMode;
  readOnly: boolean;
  features: Required<BuilderFeatures>;
  policy?: 'trusted' | SchemaPolicy;
  /** Props passed to the live `<ArtisanForm>` of the preview (kit, theme, extensions…). */
  previewProps: Record<string, unknown>;
}

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export const useBuilder = (): BuilderContextValue => {
  const value = useContext(BuilderContext);
  if (!value)
    throw new Error(
      'Builder parts must be rendered inside <FormBuilder> or <FormBuilderProvider>',
    );
  return value;
};

export const ALL_FEATURES: Required<BuilderFeatures> = {
  conditions: true,
  steps: true,
  translations: true,
  templates: true,
  import: true,
  json: true,
  preview: true,
};
