import type { ErrorRequestHandler, Response } from "express";

const errors = {
  badRequest: { status: 400, code: "BAD_REQUEST", message: "Invalid request." },
  invalidSalary: { status: 400, code: "INVALID_SALARY_DRAFT", message: "Correct the highlighted fields before saving." },
  unchangedSalary: { status: 400, code: "SALARY_UNCHANGED", message: "Change the amount or currency before saving." },
  unauthorized: { status: 401, code: "UNAUTHORIZED", message: "Sign in to access salary data." },
  notFound: { status: 404, code: "NOT_FOUND", message: "Resource not found." },
  staleSalary: { status: 409, code: "SALARY_VERSION_CONFLICT", message: "Reload the employee record before starting a new change." },
  payloadTooLarge: { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large." },
  unsupportedMedia: { status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported request encoding." },
  rateLimited: { status: 429, code: "RATE_LIMITED", message: "Too many requests." },
  internal: { status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  salaryRolledBack: { status: 500, code: "SALARY_SAVE_FAILED", message: "The salary change was rolled back." },
  unavailable: { status: 503, code: "SERVICE_UNAVAILABLE", message: "Service is unavailable." },
};

const parserErrors = new Map<string, keyof typeof errors>([
  ["entity.parse.failed", "badRequest"],
  ["request.aborted", "badRequest"],
  ["request.size.invalid", "badRequest"],
  ["entity.too.large", "payloadTooLarge"],
  ["charset.unsupported", "unsupportedMedia"],
  ["encoding.unsupported", "unsupportedMedia"],
]);

export function errorType(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

export function sendError(res: Response, kind: keyof typeof errors, fields?: Record<string, string>): void {
  const { status, code, message } = errors[kind];
  res.status(status).json({ error: { code, message, fields } });
}

export const handleError: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const parserError = error instanceof Error && "type" in error && typeof error.type === "string"
    ? parserErrors.get(error.type)
    : undefined;

  if (parserError === undefined) {
    req.log.error({ errorType: errorType(error) }, "Request failed");
  }

  sendError(res, parserError ?? "internal");
};
