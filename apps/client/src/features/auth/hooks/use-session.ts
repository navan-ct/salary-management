import { useCallback, useEffect, useRef, useState } from "react";

import { authClient } from "../api/client";

const sessionMarker = "acme:session-seen";

type SessionState =
  | { status: "loading" | "unavailable" }
  | { status: "signed-out"; expired: boolean }
  | { status: "signed-in"; name: string; expiresAt: number };

export function useSession() {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;

    try {
      const { data, error } = await authClient.getSession({ fetchOptions: { signal: controller.signal } });

      if (controller.signal.aborted) {
        return;
      }

      if (error) {
        setSession({ status: "unavailable" });
      } else if (data === null) {
        setSession({ status: "signed-out", expired: sessionStorage.getItem(sessionMarker) !== null });
      } else {
        sessionStorage.setItem(sessionMarker, "true");
        setSession({ status: "signed-in", name: data.user.name, expiresAt: new Date(data.session.expiresAt).getTime() });
      }
    } catch {
      if (!controller.signal.aborted) {
        setSession({ status: "unavailable" });
      }
    }
  }, []);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    const initialCheck = window.setTimeout(() => {
      void refresh();
    }, 0);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearTimeout(initialCheck);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      request.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    if (session.status === "signed-in") {
      const timer = window.setTimeout(() => {
        void refresh();
      }, Math.max(1000, session.expiresAt - Date.now()));
      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [refresh, session]);

  function clearSession() {
    request.current?.abort();
    sessionStorage.removeItem(sessionMarker);
    setSession({ status: "signed-out", expired: false });
  }

  const expireSession = useCallback(() => {
    request.current?.abort();
    setSession({ status: "signed-out", expired: true });
  }, []);

  return { session, refresh, clearSession, expireSession };
}
