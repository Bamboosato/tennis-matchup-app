export type ApiErrorCode =
  | "INVALID_JSON"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

type ApiErrorDetail = {
  path: string;
  message: string;
};

export function jsonOk<T>(data: T, requestId: string, init?: ResponseInit) {
  return Response.json(
    {
      data,
      meta: {
        requestId,
      },
    },
    init,
  );
}

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  requestId: string,
  details?: ApiErrorDetail[],
) {
  return Response.json(
    {
      error: {
        code,
        message,
        ...(details?.length ? { details } : {}),
      },
      meta: {
        requestId,
      },
    },
    {
      status,
    },
  );
}

export function unavailableError(requestId: string) {
  return jsonError(
    503,
    "SERVICE_UNAVAILABLE",
    "現在APIを利用できません。時間をおいて再試行してください。",
    requestId,
  );
}

