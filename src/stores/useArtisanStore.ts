import { create } from 'zustand';

interface ArtisanState {
    scheme: object;
    isFinalStep: boolean;
    setIsFinalStep: (value: boolean) => void;
}

export const useArtisanStore = create<ArtisanState>((set) => ({
    scheme: {},
    isFinalStep: false,
    setIsFinalStep: (value: boolean) => set({ isFinalStep: value }),
}));

