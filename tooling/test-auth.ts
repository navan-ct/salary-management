import { randomBytes } from "node:crypto";

export const testAuthSecret = randomBytes(32).toString("hex");
