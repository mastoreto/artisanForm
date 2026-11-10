import { expect, test } from 'bun:test';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import {
  ArtisanStoreProvider,
  useArtisanStore,
} from '../store/useArtisanStore';

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(ArtisanStoreProvider, null, children);

const useAll = () => useArtisanStore((s) => s);

test('starts idle on the first step', () => {
  const { result } = renderHook(useAll, { wrapper });
  expect(result.current.step).toBe(0);
  expect(result.current.submitState).toBe('idle');
  expect(result.current.submitError).toBeNull();
});

test('setSubmitState stores the error and clears it on the next state', async () => {
  const { result } = renderHook(useAll, { wrapper });
  const { act } = await import('@testing-library/react');
  act(() => result.current.setSubmitState('error', 'boom'));
  expect(result.current.submitError).toBe('boom');
  act(() => result.current.setSubmitState('submitting'));
  expect(result.current.submitError).toBeNull();
});

test('each provider owns an isolated store', async () => {
  const a = renderHook(useAll, { wrapper });
  const b = renderHook(useAll, { wrapper });
  const { act } = await import('@testing-library/react');
  act(() => a.result.current.setStep(3));
  expect(a.result.current.step).toBe(3);
  expect(b.result.current.step).toBe(0);
});
