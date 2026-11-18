import { z } from "zod";

export const databaseUrlSchema = z.url({ protocol: /^postgres(?:ql)?$/u });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  DATABASE_URL: databaseUrlSchema,
  HOST: z.string().trim().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  API_RATE_LIMIT: z.coerce.number().int().positive().default(120),
  TRUST_PROXY: z.string().default("").transform((value) =>
    value.split(",").map((entry) => entry.trim()).filter(Boolean),
  ),
});

export function readEnv(environment: NodeJS.ProcessEnv): z.infer<typeof envSchema> {
  const result = envSchema.safeParse(environment);

  if (!result.success) {
    const keys = result.error.issues.map(({ path }) => path.join("."));
    throw new Error(`Invalid or missing environment settings (${keys.join(", ")})`);
  }

  return result.data;
}
