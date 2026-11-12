import { describe, expect, test } from 'bun:test';
import { ValidationError } from 'yup';
import { defaultFieldRegistry } from '../../components/fields/registry';
import { NATIVE_FIELD_TYPES, normalizeArtisanSchema } from '../../schema';
import { loadValueFixtures } from '../../schema/__tests__/values/load';
import { validateValues } from '../../schema/validate';
import { buildInitialValues, buildValidationSchema } from '../buildSchema';
import { projectToRuntime } from '../project';

// Server and browser must agree on what they share. Every shared fixture is
// run through the form engine's Yup schema and through `validateValues`; the
// paths that fail must be the same. Cases marked `serverOnly` document where
// the server is deliberately stricter, so they are excluded here and instead
// asserted to be ones Yup does NOT flag (otherwise the mark is stale).
const registries = {
  fieldTypes: [...NATIVE_FIELD_TYPES],
  stepKinds: ['terms', 'payment', 'pending', 'review', 'result', 'custom'],
};

const yupPaths = async (
  fx: ReturnType<typeof loadValueFixtures>[number],
  values: unknown,
) => {
  const runtime = projectToRuntime(
    normalizeArtisanSchema(fx.schema),
    undefined,
    registries,
  ).scheme;
  const yup = buildValidationSchema(runtime, undefined, defaultFieldRegistry);
  try {
    // The browser always starts from the initial values (first option, false, []).
    const typed = { ...buildInitialValues(runtime), ...(values as object) };
    await yup.validate(typed, { abortEarly: false });
    return [];
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    return [...new Set(e.inner.map((i) => i.path ?? ''))].sort();
  }
};

for (const fx of loadValueFixtures()) {
  describe(`parity: ${fx.file}`, () => {
    for (const c of fx.cases) {
      test(c.name, async () => {
        const server = [
          ...new Set(
            validateValues(fx.schema, c.values).issues.map((i) => i.path),
          ),
        ].sort();
        const browser = await yupPaths(fx, c.values);
        if (c.serverOnly) {
          // The point of `serverOnly`: the browser misses at least one of these.
          expect(browser).not.toEqual(server);
        } else {
          expect(server).toEqual(browser);
        }
      });
    }
  });
}
