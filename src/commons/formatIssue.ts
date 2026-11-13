import type { IssueCode, ValidationIssue } from '../schema';
import type { ArtisanLabels } from './labels';

/**
 * The message for a server-side `validateValues` issue, in the language of
 * `labels` (the same texts the browser shows). Codes with no dedicated text
 * ("invalidOption", "type", …) read as "Invalid format".
 */
export const formatIssue = (
  issue: ValidationIssue,
  labels: ArtisanLabels,
): string => {
  const p = issue.params ?? {};
  const n = (k: string) => Number(p[k]);
  const code: IssueCode = issue.code;
  switch (code) {
    case 'required':
      return labels.required;
    case 'invalidEmail':
      return labels.invalidEmail;
    case 'invalidNumber':
      return labels.invalidNumber;
    case 'invalidUrl':
      return labels.invalidUrl;
    case 'invalidPhone':
      return labels.invalidPhone;
    case 'mustMatch':
      return labels.mustMatch;
    case 'endBeforeStart':
      return labels.endBeforeStart;
    case 'fileType':
      return labels.fileWrongType;
    case 'minLength':
      return labels.minLength(n('min'));
    case 'maxLength':
      return labels.maxLength(n('max'));
    case 'minValue':
      return labels.minValue(n('min'));
    case 'maxValue':
      return labels.maxValue(n('max'));
    case 'minDate':
      return labels.minDate(String(p.min));
    case 'maxDate':
      return labels.maxDate(String(p.max));
    case 'minItems':
      return labels.minItems(n('min'));
    case 'maxItems':
      return labels.maxItems(n('max'));
    case 'minFiles':
      return labels.minFiles(n('min'));
    case 'maxFiles':
      return labels.tooManyFiles(n('max'));
    case 'fileTooLarge':
      return labels.fileTooLarge(String(p.max));
    default:
      return labels.invalidPattern;
  }
};
