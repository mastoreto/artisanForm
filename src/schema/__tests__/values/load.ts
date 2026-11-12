import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtisanSchemaV1 } from '../..';

export interface ValueCase {
  name: string;
  values: unknown;
  expect: { path: string; code: string }[];
  /** The server is stricter than the browser here (Yup does not flag it). */
  serverOnly?: boolean;
  note?: string;
}

export interface ValueFixture {
  file: string;
  description: string;
  schema: ArtisanSchemaV1;
  cases: ValueCase[];
}

/** Every `*.json` file next to this module, parsed. */
export const loadValueFixtures = (): ValueFixture[] =>
  readdirSync(import.meta.dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({
      file: file.replace('.json', ''),
      ...JSON.parse(readFileSync(join(import.meta.dir, file), 'utf8')),
    }));
