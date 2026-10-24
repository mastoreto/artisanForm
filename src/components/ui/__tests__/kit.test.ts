import { describe, expect, test } from 'bun:test';
import { defineUiKit, mergeUiKits, mergeUiLayers } from '../kit';

const Box = () => null;
const Other = () => null;

describe('UI kits', () => {
  test('later layers win and nested maps merge per key', () => {
    const merged = mergeUiLayers(
      {
        components: { inputs: { text: Box, email: Box } },
        classNames: { input: 'a', label: 'l' },
        labels: { next: 'Go' },
      },
      {
        components: { inputs: { text: Other } },
        classNames: { input: 'b' },
        unstyled: true,
      },
    );
    expect(merged.components?.inputs?.text).toBe(Other);
    expect(merged.components?.inputs?.email).toBe(Box);
    expect(merged.classNames).toEqual({ input: 'b', label: 'l' });
    expect(merged.labels).toEqual({ next: 'Go' });
    expect(merged.unstyled).toBe(true);
  });

  test('undefined layers and values are ignored', () => {
    expect(mergeUiLayers(undefined, { unstyled: undefined })).toEqual({});
  });

  test('mergeUiKits names the result and defineUiKit is the identity', () => {
    const a = defineUiKit({ name: 'a', unstyled: true });
    const b = defineUiKit({ name: 'b', classNames: { input: 'x' } });
    expect(mergeUiKits('ab', a, b)).toEqual({
      name: 'ab',
      unstyled: true,
      classNames: { input: 'x' },
    });
  });
});
