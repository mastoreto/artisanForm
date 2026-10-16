import type { ArtisanFieldV1 } from './fields';
import type { ConditionV1, JSONObject, StepUIConfig } from './types';

/** Navigation overrides for a step (all plain data). */
export interface StepControlsV1 {
  hidden?: boolean;
  hidePrevious?: boolean;
  hideNext?: boolean;
  nextDisabled?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

/** Ids of functions in `extensions.hooks`; the schema never carries code. */
export interface StepHooksV1 {
  /** Runs after the step validates; may block with an error message. */
  beforeNext?: string;
  onEnter?: string;
}

export interface StepBaseV1 {
  /** Stable identity: navigation, snapshots and references use it, not the index. */
  id: string;
  title: string;
  /** The whole step is skipped (not rendered, validated or submitted) unless it holds. */
  visibleWhen?: ConditionV1;
  ui?: StepUIConfig;
  controls?: StepControlsV1;
  hooks?: StepHooksV1;
}

export interface FormStepV1 extends StepBaseV1 {
  type: 'form';
  fields: ArtisanFieldV1[];
}

export interface PaymentStepV1 extends StepBaseV1 {
  type: 'payment';
  /** Ids of the payment plugins offered (more than one lets the user choose). */
  providers: string[];
  /** Form value that stores the payment record (default `payment`). */
  resultName?: string;
  /** Plain-text note shown above the methods. */
  summary?: string;
}

/** Waits for something external through a locally registered strategy (0.2.0 `pending`). */
export interface WaitStepV1 extends StepBaseV1 {
  type: 'wait';
  /** Id of a strategy in `extensions.waits`. */
  strategy: string;
  message?: string;
  resultName?: string;
  /** Step id to return to when waiting fails (default: the previous step). */
  failTo?: string;
}

export interface TermsStepV1 extends StepBaseV1 {
  type: 'terms';
  /** Plain text; long texts scroll. */
  content?: string;
  href?: string;
  /** The required acceptance checkbox (default name `termsAccepted`). */
  accept?: { name?: string; label?: string };
}

export interface ReviewStepV1 extends StepBaseV1 {
  type: 'review';
}

export interface ResultActionV1 {
  label: string;
  href?: string;
  /** Id of a function in `extensions.actions`. */
  action?: string;
}

export interface ResultStepV1 extends StepBaseV1 {
  type: 'result';
  message?: string;
  errorMessage?: string;
  actions?: ResultActionV1[];
}

export interface CustomStepV1 extends StepBaseV1 {
  type: 'custom';
  /** Id of a component in `extensions.renderers`. */
  renderer: string;
  config?: JSONObject;
}

/** A step kind registered through `stepTypes`; custom names start with `x-`. */
export interface ExtensionStepV1 extends StepBaseV1 {
  type: `x-${string}`;
  config?: JSONObject;
}

export type NativeStepV1 =
  | FormStepV1
  | PaymentStepV1
  | WaitStepV1
  | TermsStepV1
  | ReviewStepV1
  | ResultStepV1
  | CustomStepV1;

export type ArtisanStepV1 = NativeStepV1 | ExtensionStepV1;

export type NativeStepType = NativeStepV1['type'];
