import type { ReactNode } from 'react';
import type { ArtisanLabels } from '../../commons/labels';

/**
 * What a payment plugin receives. The amount is deliberately NOT here: your
 * backend must compute/verify price, currency and items from `values` (or its
 * own order), never trust the browser.
 */
export interface PaymentRequest {
  /** Current form values (e.g. a cart id, plan, email). */
  values: Record<string, unknown>;
  /** Stable per attempt: send it to your backend to avoid double charges. */
  idempotencyKey: string;
  /** Where a hosted checkout should send the user back to. */
  returnUrl: string;
  cancelUrl: string;
  signal: AbortSignal;
}

export type PaymentResult =
  | { status: 'succeeded'; reference?: string }
  /** Accepted but not final: confirm it with a `pending` step (webhook). */
  | { status: 'processing'; reference?: string }
  | { status: 'failed'; message?: string };

export interface EmbeddedRenderProps {
  request: PaymentRequest;
  /** Report the outcome when the provider UI finishes. */
  onResult: (result: PaymentResult) => void;
  labels: ArtisanLabels;
}

/**
 * A payment provider. Stripe, Lemon Squeezy, Mercado Pago and PayPal ship as
 * plugins; write your own with this same shape. Plugins never touch card
 * data: embedded ones mount the provider's own hosted fields, redirect ones
 * send the user to the provider's checkout.
 */
/** How a provider's own plugin can be shown in the method selector. */
export interface PaymentDisplayOptions {
  /** The logo. The built-in plugins ship their brand mark; `null` shows none. */
  icon?: ReactNode | null;
  /** A line under the name. Default: whether the user stays here or is redirected. */
  description?: string;
}

export interface PaymentPlugin {
  id: string;
  /** Shown on the method selector and the pay button. */
  name: string;
  /** Shown next to the name in the method selector (decorative: the name is the label). */
  icon?: ReactNode;
  /** A line under the name; defaults to a hint by `mode` (`labels.payHintEmbedded` / `payHintRedirect`). */
  description?: string;
  mode: 'embedded' | 'redirect';
  /** embedded: mount the provider UI. */
  render?: (props: EmbeddedRenderProps) => ReactNode;
  /** redirect: create the hosted checkout (via your backend) and return its URL. */
  start?: (request: PaymentRequest) => Promise<{ url: string }>;
  /** redirect: read the provider's return params; null = not coming back from it. */
  resume?: (params: URLSearchParams) => PaymentResult | null;
  /** Query params `resume` consumed; removed from the URL afterwards. */
  resumeKeys?: string[];
}

export interface PluginsConfig {
  payments?: PaymentPlugin[];
  /** How to leave for a hosted checkout (default: `location.assign`). */
  navigate?: (url: string) => void;
}
