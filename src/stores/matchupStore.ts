"use client";

import { create } from "zustand";
import type { MatchConditionInput, MatchupResult } from "@/features/matchmaking/model/types";

export type ResultSource = "full" | "continuation";

type MatchupStoreState = {
  conditions: MatchConditionInput | null;
  result: MatchupResult | null;
  resultSource: ResultSource;
  eligibleParticipantIds: string[];
  errorMessage: string | null;
  currentSeed: number | null;
  rerollCount: number;
  isGenerating: boolean;
  isInstalled: boolean;
  setConditions: (conditions: MatchConditionInput) => void;
  setResult: (
    result: MatchupResult,
    seed: number,
    meta?: {
      source?: ResultSource;
      eligibleParticipantIds?: string[];
    },
  ) => void;
  setErrorMessage: (message: string | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  incrementRerollCount: () => void;
  setInstalled: (isInstalled: boolean) => void;
  resetResult: () => void;
};

export const useMatchupStore = create<MatchupStoreState>((set) => ({
  conditions: null,
  result: null,
  resultSource: "full",
  eligibleParticipantIds: [],
  errorMessage: null,
  currentSeed: null,
  rerollCount: 0,
  isGenerating: false,
  isInstalled: false,
  setConditions: (conditions) => set({ conditions }),
  setResult: (result, seed, meta) =>
    set({
      result,
      resultSource: meta?.source ?? "full",
      eligibleParticipantIds:
        meta?.eligibleParticipantIds ??
        result.conditions.participants.map((participant) => participant.id),
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
  resetResult: () => set({ result: null, resultSource: "full", eligibleParticipantIds: [] }),
}));
