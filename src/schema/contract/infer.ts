import type { ArtisanSchemaV1 } from './define';

// Type-level only: the values a schema produces, inferred from a literal
// schema (`defineForm` keeps the literal). No runtime, no React.

/** What a payment step stores (`resultName`, default `payment`). */
export interface InferredPayment {
  provider: string;
  status: string;
  reference?: string;
}

type Obj = Record<string, unknown>;
type Simplify<T> = { [K in keyof T]: T[K] } & {};
type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type NameOf<F> = F extends { name: infer N extends string } ? N : never;

/** The value one input holds, by field `type`. */
type ScalarOf<F> = F extends { type: infer T }
  ? T extends 'number' | 'range' | 'rating'
    ? number
    : T extends 'checkbox' | 'switch'
      ? boolean
      : T extends 'check' | 'multiselect'
        ? string[]
        : T extends 'file' | 'image'
          ? unknown
          : T extends `x-${string}`
            ? unknown
            : string
  : never;

type Entry<K extends string, V, F> = F extends { required: true }
  ? { [P in K]: V }
  : { [P in K]?: V };

type RowOf<Items> = UnionToIntersection<
  Items extends unknown ? FieldEntry<Items> : never
>;

/** The value(s) one field contributes: `{ [name]: value }` (`never` = none, so it drops out of the union). */
type FieldEntry<F> = F extends {
  type: 'heading' | 'paragraph' | 'callout' | 'divider';
}
  ? never
  : F extends { type: 'array'; itemFields: readonly (infer I)[] }
    ? Entry<NameOf<F>, Simplify<RowOf<I>>[], F>
    : F extends { type: 'daterange' }
      ? Entry<NameOf<F>, string, F> &
          (F extends { endName: infer E extends string }
            ? Entry<E, string, F>
            : unknown)
      : F extends { type: 'dynamicSelect' }
        ? Entry<NameOf<F>, string, F> &
            (F extends { dependentName: infer D extends string }
              ? Entry<D, string, F>
              : unknown)
        : Entry<NameOf<F>, ScalarOf<F>, F>;

type StepEntry<S> = S extends { type: 'form'; fields: readonly (infer F)[] }
  ? UnionToIntersection<F extends unknown ? FieldEntry<F> : never>
  : S extends { type: 'payment'; resultName: infer N extends string }
    ? { [P in N]?: InferredPayment }
    : S extends { type: 'payment' }
      ? { payment?: InferredPayment }
      : S extends { type: 'wait'; resultName: infer N extends string }
        ? { [P in N]?: unknown }
        : S extends { type: 'terms'; accept: { name: infer N extends string } }
          ? { [P in N]?: boolean }
          : S extends { type: 'terms' }
            ? { termsAccepted?: boolean }
            : never;

/**
 * The submitted values of a schema, from its literal type (use `defineForm`,
 * or `as const`). Fields with `required: true` are required keys; the rest are
 * optional because a hidden step or field is not submitted. Values owned by
 * `x-*` and file fields are `unknown`. For a schema that is not a literal
 * (`ArtisanSchemaV1`, a parsed JSON) it is a plain record.
 */
export type InferValues<S extends ArtisanSchemaV1> = ArtisanSchemaV1 extends S
  ? Obj
  : S extends { steps: readonly (infer St)[] }
    ? Simplify<UnionToIntersection<St extends unknown ? StepEntry<St> : never>>
    : Obj;
