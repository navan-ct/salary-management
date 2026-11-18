import { sql } from "drizzle-orm";
import { Router } from "express";

import type { Database } from "../../db/client.js";
import { errorType, sendError } from "../../http/errors.js";

export function createHealthRouter(db: Database): Router {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/ready", async (req, res) => {
    try {
      await db.execute(sql`select 1`);
    } catch (error) {
      req.log.warn({ errorType: errorType(error) }, "Database readiness check failed");
      sendError(res, "unavailable");
      return;
    }

    res.json({ status: "ready" });
  });

  return router;
}
