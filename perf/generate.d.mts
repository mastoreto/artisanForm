import type { ArtisanSchemaV1 } from '../src/schema';

export const generateSchema: (
  fields: number,
  seed?: number,
  perStep?: number,
) => ArtisanSchemaV1;
export const SIZES: number[];
