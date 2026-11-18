import { extname, join } from "node:path";

import compression from "compression";
import express, { Router } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import type { Logger } from "pino";

import type { Database } from "./db/client.js";
import { handleError, sendError } from "./http/errors.js";
import { requestLogging } from "./http/request-logging.js";
import { createHealthRouter } from "./modules/health/router.js";

interface AppOptions {
  db: Database;
  logger: Logger;
  production?: boolean;
  trustProxy?: string[];
  apiRateLimit?: number;
  clientDir?: string;
}

export function createApp({
  db,
  logger,
  production = false,
  trustProxy = [],
  apiRateLimit = 120,
  clientDir,
}: AppOptions) {
  const app = express();
  app.disable("x-powered-by");
  app.enable("case sensitive routing");
  app.set("trust proxy", trustProxy);

  app.use(requestLogging(logger));
  app.use(helmet({
    contentSecurityPolicy: {
      directives: { upgradeInsecureRequests: production ? [] : null },
    },
    strictTransportSecurity: production,
  }));
  app.use(compression());

  const api = Router();
  api.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  api.use(rateLimit({
    windowMs: 60_000,
    limit: apiRateLimit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, "rateLimited");
    },
  }));
  api.use(express.json({ limit: "64kb" }));
  api.use("/health", createHealthRouter(db));
  api.use((_req, res) => {
    sendError(res, "notFound");
  });
  app.use("/api", api);

  if (clientDir !== undefined) {
    app.use("/assets", express.static(join(clientDir, "assets"), {
      immutable: true,
      index: false,
      maxAge: "1y",
      redirect: false,
    }));
    app.use("/assets", (_req, res) => {
      sendError(res, "notFound");
    });
    app.use(express.static(clientDir, { index: false, redirect: false }));
    app.get("/{*path}", (req, res, next) => {
      res.vary("Accept");

      if (extname(req.path) !== "" || req.accepts("html") === false) {
        next();
        return;
      }

      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(join(clientDir, "index.html"));
    });
  }

  app.use((_req, res) => {
    sendError(res, "notFound");
  });
  app.use(handleError);

  return app;
}
