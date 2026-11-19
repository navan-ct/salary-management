import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";

import type { Database } from "../../db/client.js";
import { sendError } from "../../http/errors.js";

export interface AuthSettings {
  secret: string;
  baseURL: string;
}

declare module "express-serve-static-core" {
  interface Locals {
    manager?: { id: string; name: string };
  }
}

export function createAuth(db: Database, { secret, baseURL }: AuthSettings) {
  return betterAuth({
    appName: "ACME Salary Management",
    secret,
    baseURL,
    database: drizzleAdapter(db, { provider: "pg", transaction: true }),
    emailAndPassword: { enabled: true, disableSignUp: true },
    disabledPaths: ["/sign-up/email"],
    advanced: { useSecureCookies: baseURL.startsWith("https://") },
    logger: { disabled: true },
  });
}

export function requireSession(auth: ReturnType<typeof createAuth>): RequestHandler {
  return async (req, res, next) => {
    const { response, headers } = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      returnHeaders: true,
    });

    for (const cookie of headers.getSetCookie()) {
      res.append("Set-Cookie", cookie);
    }

    if (response === null) {
      sendError(res, "unauthorized");
      return;
    }

    const { id, name } = response.user;
    res.locals.manager = { id, name };
    next();
  };
}
