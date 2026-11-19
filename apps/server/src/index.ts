import { once } from "node:events";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { pino } from "pino";

import { createApp } from "./app.js";
import { readEnv } from "./config/env.js";
import { createDatabase } from "./db/client.js";
import { errorType } from "./http/errors.js";

async function main(): Promise<void> {
  const settings = readEnv(process.env);
  process.env.NODE_ENV = settings.NODE_ENV;

  const logger = pino({ level: settings.LOG_LEVEL });
  const clientDir = process.argv.includes("--api-only")
    ? undefined
    : fileURLToPath(new URL("../../client/dist/", import.meta.url));

  if (clientDir !== undefined) {
    await access(join(clientDir, "index.html")).catch(() => {
      throw new Error("Client build is missing. Run npm run build before starting the server.");
    });
  }

  const { db, pool } = createDatabase(settings.DATABASE_URL);
  pool.on("error", (error) => {
    logger.error({ errorType: errorType(error) }, "Idle PostgreSQL connection failed");
  });

  const app = createApp({
    db,
    logger,
    authSettings: { secret: settings.BETTER_AUTH_SECRET, baseURL: settings.BETTER_AUTH_URL },
    production: settings.NODE_ENV === "production",
    trustProxy: settings.TRUST_PROXY,
    apiRateLimit: settings.API_RATE_LIMIT,
    ...(clientDir === undefined ? {} : { clientDir }),
  });
  const server = createServer({
    headersTimeout: 10_000,
    requestTimeout: 30_000,
    keepAliveTimeout: 5_000,
  }, app);

  try {
    await once(server.listen(settings.PORT, settings.HOST), "listening");
  } catch (error) {
    await pool.end();
    throw error;
  }

  logger.info({ host: settings.HOST, port: settings.PORT }, "HTTP server listening");

  async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (!server.listening) {
      return;
    }

    logger.info({ signal }, "Shutting down");
    const deadline = setTimeout(() => {
      logger.fatal("Shutdown timed out");
      process.exit(1);
    }, 10_000).unref();

    try {
      try {
        await server[Symbol.asyncDispose]();
      } finally {
        await pool.end();
      }
    } catch (error) {
      logger.error({ errorType: errorType(error) }, "Shutdown failed");
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
    }
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

try {
  await main();
} catch (error) {
  pino().fatal({ err: error }, "Server startup failed");
  process.exitCode = 1;
}
