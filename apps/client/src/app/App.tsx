import { type ReactElement, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";

import { authClient } from "../features/auth/api/client";
import { useSession } from "../features/auth/hooks/use-session";
import { SignInPage } from "../features/auth/pages/SignInPage";
import { EmployeeDirectoryPage } from "../features/employees/pages/EmployeeDirectoryPage";
import { Button } from "../shared/components/Button";
import { Notice, StatePanel } from "../shared/components/Feedback";
import { AppShell, PageContainer } from "../shared/components/Layout";
import { NotFoundPage } from "./routes/NotFoundPage";

const signInPath = "/sign-in";
const directoryPath = "/employees";

function AuthenticatedApp({ name, onSignedOut }: { name: string; onSignedOut: () => void }): ReactElement {
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignOutFailed(false);

    try {
      const { error } = await authClient.signOut();

      if (error) {
        setSignOutFailed(true);
      } else {
        onSignedOut();
      }
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <AppShell account={{ name, signingOut, onSignOut: () => {
      void signOut();
    } }}>
      <PageContainer>
        {signOutFailed && <Notice title="Could not sign out. Try again." tone="error" announce />}
        <Routes>
          <Route path={directoryPath} element={<EmployeeDirectoryPage />} />
          <Route path="*" element={<NotFoundPage directoryPath={directoryPath} />} />
        </Routes>
      </PageContainer>
    </AppShell>
  );
}

function SessionRouter(): ReactElement {
  const { session, refresh, clearSession } = useSession();
  const { pathname } = useLocation();

  switch (session.status) {
    case "loading":
      return <PageContainer narrow><StatePanel state="loading" title="Checking your session…" /></PageContainer>;
    case "unavailable":
      return (
        <PageContainer narrow>
          <StatePanel
            state="error"
            title="Could not check your session"
            action={<Button onClick={() => {
              void refresh();
            }}>Retry</Button>}
          />
        </PageContainer>
      );
    case "signed-out":
      return pathname === signInPath
        ? <SignInPage expired={session.expired} onSignedIn={refresh} />
        : <Navigate to={signInPath} replace />;
    case "signed-in":
      return pathname === "/" || pathname === signInPath
        ? <Navigate to={directoryPath} replace />
        : <AuthenticatedApp name={session.name} onSignedOut={clearSession} />;
  }
}

export function App(): ReactElement {
  return <BrowserRouter><SessionRouter /></BrowserRouter>;
}
