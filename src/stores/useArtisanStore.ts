import { createContext, createElement, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { createStore, useStore } from 'zustand';

interface ArtisanFormState {
  step: number;
  processStep: number;
  isFinalStep: boolean;
  setStep: (value: number) => void;
  setProcessStep: (value: number) => void;
  setIsFinalStep: (value: boolean) => void;
}

const createArtisanStore = () =>
  createStore<ArtisanFormState>((set) => ({
    step: 0,
    processStep: 0,
    isFinalStep: false,
    setStep: (value: number) => set({ step: value }),
    setProcessStep: (value: number) => set({ processStep: value }),
    setIsFinalStep: (value: boolean) => set({ isFinalStep: value }),
  }));

// Fallback for components rendered outside an ArtisanStoreProvider
// (e.g. a lone <Controls /> in a story).
const defaultStore = createArtisanStore();
const ArtisanStoreContext = createContext(defaultStore);

/** Gives its children their own step state, isolated from other forms. */
export const ArtisanStoreProvider = ({ children }: { children: ReactNode }) => {
  const [store] = useState(createArtisanStore);
  return createElement(
    ArtisanStoreContext.Provider,
    { value: store },
    children,
  );
};

export const useArtisanStore = <T>(
  selector: (state: ArtisanFormState) => T,
): T => useStore(useContext(ArtisanStoreContext), selector);
