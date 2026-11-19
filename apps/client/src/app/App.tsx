import { type ReactElement, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";

import { authClient } from "../features/auth/api/client";
import { useSession } from "../features/auth/hooks/use-session";
import { SignInPage } from "../features/auth/pages/SignInPage";
import { ChangeSalaryPage } from "../features/employees/pages/ChangeSalaryPage";
import { EmployeeDirectoryPage } from "../features/employees/pages/EmployeeDirectoryPage";
import { EmployeeRecordPage } from "../features/employees/pages/EmployeeRecordPage";
import { Button } from "../shared/components/Button";
import { Notice, StatePanel } from "../shared/components/Feedback";
import { AppShell, PageContainer } from "../shared/components/Layout";
import { NotFoundPage } from "./routes/NotFoundPage";

const signInPath = "/sign-in";
const directoryPath = "/employees";

interface AuthenticatedAppProps {
  name: string;
  onSignedOut: () => void;
  onSessionExpired: () => void;
}

function AuthenticatedApp({ name, onSignedOut, onSessionExpired }: AuthenticatedAppProps): ReactElement {
  const { pathname } = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [pathname]);

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
    <AppShell navigation={[{ label: "Employees", href: directoryPath, active: true, current: pathname === directoryPath }]}
      account={{ name, signingOut, onSignOut: () => {
        void signOut();
      } }}>
      <PageContainer>
        {signOutFailed && <Notice title="Could not sign out. Try again." tone="error" announce />}
        <Routes>
          <Route path={directoryPath} element={<EmployeeDirectoryPage onSessionExpired={onSessionExpired} />} />
          <Route path={`${directoryPath}/:employeeId`} element={<EmployeeRecordPage onSessionExpired={onSessionExpired} />} />
          <Route path={`${directoryPath}/:employeeId/change-salary`} element={<ChangeSalaryPage onSessionExpired={onSessionExpired} />} />
          <Route path="*" element={<NotFoundPage directoryPath={directoryPath} />} />
        </Routes>
      </PageContainer>
    </AppShell>
  );
}

function SessionRouter(): ReactElement {
  const { session, refresh, clearSession, expireSession } = useSession();
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
        : <AuthenticatedApp name={session.name} onSignedOut={clearSession} onSessionExpired={expireSession} />;
  }
}

export function App(): ReactElement {
  return <SessionRouter />;
}
