import { ZodError } from "zod";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { createRequestId, readJsonBody } from "@/lib/server/request";
import {
  authenticateApiRequest,
  logApiRequest,
  mapServerErrorToResponse,
} from "@/features/admin/application/apiAuth";
import { generateMatchupUseCase } from "@/features/matchmaking/application/generateMatchupUseCase";
import {
  generateMatchupApiSchema,
  zodIssuesToDetails,
} from "@/features/matchmaking/application/apiSchemas";
import type { MatchConditionInput } from "@/features/matchmaking/model/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let authAccount: Awaited<ReturnType<typeof authenticateApiRequest>> | null = null;

  try {
    const auth = await authenticateApiRequest(request, "matchups:generate", requestId);
    authAccount = auth;

    if ("response" in auth) {
      return auth.response;
    }

    const body = await readJsonBody(request);
    const parsed = generateMatchupApiSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        422,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        requestId,
        zodIssuesToDetails(parsed.error),
      );
    }

    const { seed, ...input } = parsed.data;
    const baseSeed = seed ?? Math.floor(Date.now() % 1_000_000_000);
    const result = generateMatchupUseCase(input as MatchConditionInput, baseSeed);

    await logApiRequest({
      account: auth.account,
      courtCount: input.courtCount,
      durationMs: Date.now() - startedAt,
      endpoint: "/api/v1/matchups/generate",
      method: "POST",
      participantCount: input.participantCount,
      requestId,
      roundCount: input.roundCount,
      seed: result.seed,
      status: 200,
    });

    return jsonOk(result, requestId);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON") {
      return jsonError(400, "INVALID_JSON", "JSONとして解析できません。", requestId);
    }

    if (error instanceof ZodError) {
      return jsonError(
        422,
        "VALIDATION_ERROR",
        "入力内容を確認してください。",
        requestId,
        zodIssuesToDetails(error),
      );
    }

    await logApiRequest({
      account: authAccount && !("response" in authAccount) ? authAccount.account : undefined,
      durationMs: Date.now() - startedAt,
      endpoint: "/api/v1/matchups/generate",
      method: "POST",
      requestId,
      status: 503,
    });

    return mapServerErrorToResponse(error, requestId);
  }
}

