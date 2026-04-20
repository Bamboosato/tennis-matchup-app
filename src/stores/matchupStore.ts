"use client";

import { create } from "zustand";
import type { MatchConditionInput, MatchupResult } from "@/features/matchmaking/model/types";

type MatchupStoreState = {
  conditions: MatchConditionInput | null;
  result: MatchupResult | null;
  errorMessage: string | null;
  currentSeed: number | null;
  rerollCount: number;
  isGenerating: boolean;
  isInstalled: boolean;
  setConditions: (conditions: MatchConditionInput) => void;
  setResult: (result: MatchupResult, seed: number) => void;
  setErrorMessage: (message: string | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  incrementRerollCount: () => void;
  setInstalled: (isInstalled: boolean) => void;
  resetResult: () => void;
};

export const useMatchupStore = create<MatchupStoreState>((set) => ({
  conditions: null,
  result: null,
  errorMessage: null,
  currentSeed: null,
  rerollCount: 0,
  isGenerating: false,
  isInstalled: false,
  setConditions: (conditions) => set({ conditions }),
  setResult: (result, seed) =>
    set({
      result,
      currentSeed: seed,
      errorMessage: null,
    }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  incrementRerollCount: () =>
    set((state) => ({
      rerollCount: state.rerollCount + 1,
    })),
  setInstalled: (isInstalled) => set({ isInstalled }),
  resetResult: () => set({ result: null }),
}));
