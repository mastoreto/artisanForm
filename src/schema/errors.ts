import type { SchemaIssue } from './types';

/** Thrown when a schema that must be valid is not; `issues` says why and where. */
export class ArtisanSchemaError extends Error {
  readonly issues: SchemaIssue[];
  constructor(issues: SchemaIssue[]) {
    const first = issues.find((i) => i.severity === 'error') ?? issues[0];
    super(
      `Invalid ArtisanForm schema: ${first ? `${first.path}: ${first.message}` : 'unknown error'}${issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}`,
    );
    this.name = 'ArtisanSchemaError';
    this.issues = issues;
  }
}
