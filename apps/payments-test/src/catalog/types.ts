import type {
  ArtisanExtensions,
  ArtisanSchemaV1,
  PaymentPlugin,
} from 'artisanform';

/** What an example needs from the app to build its schema. */
export interface Ctx {
  /** Real sandbox plugins when the backend has credentials, else the mock. */
  plugins: PaymentPlugin[];
  /** `true` when `plugins` talk to the backend (confirmation can poll it). */
  real: boolean;
  /** Drops the draft and starts the example again. */
  restart: () => void;
}

export interface Built {
  scheme: ArtisanSchemaV1;
  extensions?: ArtisanExtensions;
}

export interface Example {
  id: string;
  group: 'Registration' | 'Payments' | 'Government & banking' | 'Product';
  title: string;
  summary: string;
  /** Library features the example shows. */
  features: string[];
  /** Show the provider credentials table above the form. */
  payments?: boolean;
  build: (ctx: Ctx) => Built;
}
