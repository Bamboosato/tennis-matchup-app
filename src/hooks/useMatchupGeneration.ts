"use client";

import { useCallback } from "react";
import { ZodError } from "zod";
import { generateMatchupUseCase } from "@/features/matchmaking/application/generateMatchupUseCase";
import type { MatchConditionInput } from "@/features/matchmaking/model/types";
import { useMatchupStore } from "@/stores/matchupStore";

const MIN_GENERATION_LOADING_MS = 1000;

function zodMessage(error: ZodError): string {
  const firstIssue = error.issues[0];

  return firstIssue?.message ?? "入力内容を確認してください";
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useMatchupGeneration() {
  const setConditions = useMatchupStore((state) => state.setConditions);
  const setResult = useMatchupStore((state) => state.setResult);
  const setErrorMessage = useMatchupStore((state) => state.setErrorMessage);
  const setGenerating = useMatchupStore((state) => state.setGenerating);
  const incrementRerollCount = useMatchupStore((state) => state.incrementRerollCount);

  const generate = useCallback(
    async (input: MatchConditionInput, seed: number) => {
      const startedAt = Date.now();
      setGenerating(true);

      try {
        const result = generateMatchupUseCase(input, seed);
        const elapsed = Date.now() - startedAt;

        if (elapsed < MIN_GENERATION_LOADING_MS) {
          await wait(MIN_GENERATION_LOADING_MS - elapsed);
        }

        setConditions(input);
        setResult(result, result.seed);
        return result;
      } catch (error) {
        const elapsed = Date.now() - startedAt;

        if (elapsed < MIN_GENERATION_LOADING_MS) {
          await wait(MIN_GENERATION_LOADING_MS - elapsed);
        }

        if (error instanceof ZodError) {
          setErrorMessage(zodMessage(error));
        } else if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("組合せを作成できませんでした。条件を見直してください。");
        }

        return null;
      } finally {
        setGenerating(false);
      }
    },
    [setConditions, setErrorMessage, setGenerating, setResult],
  );

  const regenerate = useCallback(
    async (input: MatchConditionInput, seed: number) => {
      incrementRerollCount();
      return generate(input, seed);
    },
    [generate, incrementRerollCount],
  );

  return {
    generate,
    regenerate,
  };
}
