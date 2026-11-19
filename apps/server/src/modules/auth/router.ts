import { toNodeHandler } from "better-auth/node";
import { Router, text } from "express";

import type { createAuth } from "./auth.js";

export function createAuthRouter(auth: ReturnType<typeof createAuth>): Router {
  const router = Router({ caseSensitive: true });
  const authHandler = toNodeHandler(auth);

  router.post(
    ["/sign-in/email", "/sign-out"],
    text({ type: () => true, limit: "64kb", inflate: false }),
    (req, res) => {
      if (req.body === "") {
        req.body = undefined;
      }

      return authHandler(req, res);
    },
  );
  router.get("/get-session", authHandler);

  return router;
}
