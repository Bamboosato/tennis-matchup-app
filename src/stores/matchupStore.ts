"use client";

import { create } from "zustand";
import type {
  MatchConditionInput,
  MatchFormat,
  MatchupResult,
} from "@/features/matchmaking/model/types";

export type ResultSource = "full" | "continuation";

export type CompletedRoundsState = {
  generatedAt: string | null;
  completedRoundCount: number;
  lockedCompletedRoundCount: number;
};

type CompletedRoundsStateUpdate =
  | CompletedRoundsState
  | ((current: CompletedRoundsState) => CompletedRoundsState);

const initialCompletedRoundsState: CompletedRoundsState = {
  generatedAt: null,
  completedRoundCount: 0,
  lockedCompletedRoundCount: 0,
};

export type MatchupFormatState = {
  conditions: MatchConditionInput | null;
  result: MatchupResult | null;
  resultSource: ResultSource;
  eligibleParticipantIds: string[];
  completedRoundsState: CompletedRoundsState;
  currentSeed: number | null;
  rerollCount: number;
};

function initialFormatState(): MatchupFormatState {
  return {
    conditions: null,
    result: null,
    resultSource: "full",
    eligibleParticipantIds: [],
    completedRoundsState: initialCompletedRoundsState,
    currentSeed: null,
    rerollCount: 0,
  };
}

function inputMatchFormat(input: MatchConditionInput): MatchFormat {
  return input.matchFormat ?? "doubles";
}

type MatchupStoreState = {
  byFormat: Record<MatchFormat, MatchupFormatState>;
  errorMessage: string | null;
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
  setCompletedRoundsState: (
    matchFormat: MatchFormat,
    update: CompletedRoundsStateUpdate,
  ) => void;
  setErrorMessage: (message: string | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  incrementRerollCount: (matchFormat: MatchFormat) => void;
  setInstalled: (isInstalled: boolean) => void;
  resetResult: (matchFormat?: MatchFormat) => void;
};

export const useMatchupStore = create<MatchupStoreState>((set) => ({
  byFormat: {
    doubles: initialFormatState(),
    singles: initialFormatState(),
  },
  errorMessage: null,
  isGenerating: false,
  isInstalled: false,
  setConditions: (conditions) =>
    set((state) => {
      const matchFormat = inputMatchFormat(conditions);

      return {
        byFormat: {
          ...state.byFormat,
          [matchFormat]: {
            ...state.byFormat[matchFormat],
            conditions,
          },
        },
      };
    }),
  setResult: (result, seed, meta) =>
    set((state) => {
      const matchFormat = result.conditions.matchFormat;

      return {
        byFormat: {
          ...state.byFormat,
          [matchFormat]: {
            ...state.byFormat[matchFormat],
            result,
            resultSource: meta?.source ?? "full",
            eligibleParticipantIds:
              meta?.eligibleParticipantIds ??
              result.conditions.participants.map((participant) => participant.id),
            currentSeed: seed,
            completedRoundsState: {
              generatedAt: result.generatedAt,
              completedRoundCount: 0,
              lockedCompletedRoundCount: 0,
            },
          },
        },
        errorMessage: null,
      };
    }),
  setCompletedRoundsState: (matchFormat, update) =>
    set((state) => {
      const currentFormatState = state.byFormat[matchFormat];

      return {
        byFormat: {
          ...state.byFormat,
          [matchFormat]: {
            ...currentFormatState,
            completedRoundsState:
              typeof update === "function"
                ? update(currentFormatState.completedRoundsState)
                : update,
          },
        },
      };
    }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  setGenerating: (isGenerating) => set({ isGenerating }),
  incrementRerollCount: (matchFormat) =>
    set((state) => ({
      byFormat: {
        ...state.byFormat,
        [matchFormat]: {
          ...state.byFormat[matchFormat],
          rerollCount: state.byFormat[matchFormat].rerollCount + 1,
        },
      },
    })),
  setInstalled: (isInstalled) => set({ isInstalled }),
  resetResult: (matchFormat) =>
    set((state) => {
      if (matchFormat) {
        return {
          byFormat: {
            ...state.byFormat,
            [matchFormat]: initialFormatState(),
          },
        };
      }

      return {
        byFormat: {
          doubles: initialFormatState(),
          singles: initialFormatState(),
        },
      };
    }),
}));
