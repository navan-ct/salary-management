import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

import type { Logger } from "pino";
import { pinoHttp } from "pino-http";

export function requestLogging(logger: Logger) {
  return pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const id = randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    serializers: {
      req: (request: Pick<IncomingMessage, "id" | "method">) => ({
        id: request.id,
        method: request.method,
      }),
      res: (response: Pick<ServerResponse, "statusCode">) => ({ statusCode: response.statusCode }),
      err: () => ({ type: "RequestError" }),
    },
    customLogLevel: (_req, res, error) => {
      if (error !== undefined || res.statusCode >= 500) {
        return "error";
      }

      return res.statusCode >= 400 ? "warn" : "info";
    },
  });
}
