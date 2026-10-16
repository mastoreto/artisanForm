import { create } from 'zustand';

interface ArtisanFormState {
  step: number;
  processStep: number;
  isFinalStep: boolean;
  setStep: (value: number) => void;
  setProcessStep: (value: number) => void;
  setIsFinalStep: (value: boolean) => void;
}

export const useArtisanStore = create<ArtisanFormState>((set) => ({
  step: 0,
  processStep: 0,
  isFinalStep: false,
  setStep: (value: number) => set({ step: value }),
  setProcessStep: (value: number) => set({ processStep: value }),
  setIsFinalStep: (value: boolean) => set({ isFinalStep: value }),
}));
