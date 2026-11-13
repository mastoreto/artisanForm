/**
 * The JSON text of a value with its object keys sorted, at every depth: the
 * same content always gives the same text, whatever the key order it was built
 * or read with. Arrays keep their order (it is meaningful). `undefined`
 * properties are dropped, as `JSON.stringify` does.
 */
export const canonicalize = (value: unknown): string => {
  const walk = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(walk)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, walk((v as Record<string, unknown>)[k])]),
          )
        : v;
  return JSON.stringify(walk(value));
};

/**
 * SHA-256 of the canonical text, as lowercase hexadecimal (64 characters). Use
 * it as an ETag, as the identity of a revision, or to tell whether a schema
 * changed. Hash the schema as you store it: parsing it, normalizing it or
 * reformatting it first gives a different (still stable) hash.
 */
export const schemaHash = async (value: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(canonicalize(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};
