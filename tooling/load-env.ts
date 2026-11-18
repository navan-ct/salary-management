import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

export function loadWorkspaceEnv(): void {
  const envFile = new URL("../.env", import.meta.url);

  if (existsSync(envFile)) {
    loadEnvFile(envFile);
  }
}
