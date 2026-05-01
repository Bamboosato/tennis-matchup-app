import { ZodError } from "zod";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { createRequestId, readJsonBody } from "@/lib/server/request";
import {
  authenticateApiRequest,
  logApiRequest,
  mapServerErrorToResponse,
} from "@/features/admin/application/apiAuth";
import { buildMatchConditions } from "@/features/matchmaking/application/buildMatchConditions";
import {
  replayMatchupApiSchema,
  zodIssuesToDetails,
} from "@/features/matchmaking/application/apiSchemas";
import { generateMatchup } from "@/features/matchmaking/domain/generateMatchup";
import type { MatchConditionInput } from "@/features/matchmaking/model/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  let authAccount: Awaited<ReturnType<typeof authenticateApiRequest>> | null = null;

  try {
    const auth = await authenticateApiRequest(request, "matchups:replay", requestId);
    authAccount = auth;

    if ("response" in auth) {
      return auth.response;
    }

    const body = await readJsonBody(request);
    const parsed = replayMatchupApiSchema.safeParse(body);

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
    const conditions = buildMatchConditions(input as MatchConditionInput);
    const result = generateMatchup(conditions, seed);

    await logApiRequest({
      account: auth.account,
      courtCount: input.courtCount,
      durationMs: Date.now() - startedAt,
      endpoint: "/api/v1/matchups/replay",
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
      endpoint: "/api/v1/matchups/replay",
      method: "POST",
      requestId,
      status: 503,
    });

    return mapServerErrorToResponse(error, requestId);
  }
}

