import { type ReactElement, useEffect, useState } from "react";

const statusText = {
  checking: "Checking API connection…",
  ready: "API is connected.",
  unavailable: "API is unavailable.",
};

export function App(): ReactElement {
  const [status, setStatus] = useState<keyof typeof statusText>("checking");

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/health/ready", { signal: controller.signal })
      .then((response) => {
        setStatus(response.ok ? "ready" : "unavailable");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus("unavailable");
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main>
      <h1>ACME Salary Management</h1>
      <p role="status">{statusText[status]}</p>
    </main>
  );
}
