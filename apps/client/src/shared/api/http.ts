export class HttpRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Request failed with status ${String(status)}.`);
    this.status = status;
  }
}

export async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new HttpRequestError(response.status);
  }

  return (await response.json()) as T;
}
