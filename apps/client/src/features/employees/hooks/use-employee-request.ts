import { useEffect, useState } from "react";

import { EmployeeRequestError } from "../api/employees";

type Result<T> = { status: "ready"; data: T } | { status: "missing" | "error" };

interface Response<T> {
  load: (signal: AbortSignal) => Promise<T>;
  attempt: number;
  result: Result<T>;
  latestData: T | undefined;
}

export function useEmployeeRequest<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onSessionExpired: () => void,
  delay = 0,
) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<Response<T>>();

  useEffect(() => {
    const controller = new AbortController();

    function finish(result: Result<T>) {
      if (!controller.signal.aborted) {
        setResponse((previous) => ({
          load, attempt, result, latestData: result.status === "ready" ? result.data : previous?.latestData,
        }));
      }
    }

    async function read() {
      try {
        finish({ status: "ready", data: await load(controller.signal) });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const status = error instanceof EmployeeRequestError ? error.status : undefined;
        if (status === 401) {
          onSessionExpired();
          return;
        }

        finish({ status: status === 404 ? "missing" : "error" });
      }
    }

    const timer = window.setTimeout(() => {
      void read();
    }, delay);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, delay, load, onSessionExpired]);

  const result = response?.load === load && response.attempt === attempt ? response.result : { status: "loading" as const };
  return { result, latestData: response?.latestData, retry: () => {
    setAttempt((previous) => previous + 1);
  } };
}
