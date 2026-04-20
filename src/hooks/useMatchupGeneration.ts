"use client";

import { useCallback } from "react";
import { ZodError } from "zod";
import { generateMatchupUseCase } from "@/features/matchmaking/application/generateMatchupUseCase";
import type { MatchConditionInput } from "@/features/matchmaking/model/types";
import { useMatchupStore } from "@/stores/matchupStore";

function zodMessage(error: ZodError): string {
  const firstIssue = error.issues[0];

  return firstIssue?.message ?? "入力内容を確認してください";
}

export function useMatchupGeneration() {
  const setConditions = useMatchupStore((state) => state.setConditions);
  const setResult = useMatchupStore((state) => state.setResult);
  const setErrorMessage = useMatchupStore((state) => state.setErrorMessage);
  const setGenerating = useMatchupStore((state) => state.setGenerating);
  const incrementRerollCount = useMatchupStore((state) => state.incrementRerollCount);

  const generate = useCallback(
    (input: MatchConditionInput, seed: number) => {
      setGenerating(true);

      try {
        const result = generateMatchupUseCase(input, seed);
        setConditions(input);
        setResult(result, result.seed);
        return result;
      } catch (error) {
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
    (input: MatchConditionInput, seed: number) => {
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
