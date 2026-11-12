import { expect, test } from 'bun:test';
import type { IssueCode } from '../../schema';
import { formatIssue } from '../formatIssue';
import { defaultLabels } from '../labels';

const f = (code: IssueCode, params?: Record<string, number | string>) =>
  formatIssue({ path: 'x', code, params }, defaultLabels);

test('issues read like the browser messages', () => {
  expect(f('required')).toBe('Required field');
  expect(f('invalidEmail')).toBe('Invalid email');
  expect(f('minLength', { min: 3 })).toBe('Minimum 3 characters');
  expect(f('maxLength', { max: 9 })).toBe('Maximum 9 characters');
  expect(f('minValue', { min: 2 })).toBe('Minimum 2');
  expect(f('maxValue', { max: 8 })).toBe('Maximum 8');
  expect(f('minDate', { min: '2026-01-01' })).toBe('From 2026-01-01');
  expect(f('maxItems', { max: 4 })).toBe('Maximum 4 items');
  expect(f('minFiles', { min: 2 })).toBe('Upload at least 2 files');
  expect(f('maxFiles', { max: 5 })).toBe('Maximum 5 files');
  expect(f('pattern')).toBe('Invalid format');
  expect(f('invalidOption')).toBe('Invalid format');
});

test('uses the labels it is given (another language)', () => {
  const es = { ...defaultLabels, required: 'Obligatorio' };
  expect(formatIssue({ path: 'x', code: 'required' }, es)).toBe('Obligatorio');
});
