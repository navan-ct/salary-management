import { type ReactElement, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { Notice } from "../../../shared/components/Feedback";
import { Form } from "../../../shared/components/Form";
import { PageContainer, PageHeader, Panel } from "../../../shared/components/Layout";
import { TextField } from "../../../shared/components/TextField";
import { authClient } from "../api/client";

interface SignInPageProps {
  expired: boolean;
  onSignedIn: () => Promise<void>;
}

const unavailableMessage = "Could not sign in. Try again.";

export function SignInPage({ expired, onSignedIn }: SignInPageProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function signIn(formData: FormData) {
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
      return;
    }

    setError(undefined);
    setBusy(true);

    try {
      const result = await authClient.signIn.email({ email: email.trim(), password, rememberMe: false });

      if (result.error) {
        const { code, status } = result.error;
        if (code === "INVALID_EMAIL_OR_PASSWORD") {
          setError("Invalid email or password. Check your details and try again.");
        } else if (status === 429) {
          setError("Too many sign-in attempts. Try again shortly.");
        } else {
          setError(unavailableMessage);
        }
        return;
      }

      await onSignedIn();
    } catch {
      setError(unavailableMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer narrow>
      <Panel>
        <p className="text-heading font-semibold">ACME Salary Management</p>
        <PageHeader title="Sign in" description={expired ? undefined : "For authorized ACME HR managers."} />
        {expired && (
          <Notice title="Your session expired" tone="warning" announce>
            Sign in again to access salary data.
          </Notice>
        )}
        {error !== undefined && <Notice title={error} tone="error" announce />}
        <Form onSubmit={(data) => {
          void signIn(data);
        }} busy={busy}>
          <TextField label="Work email" name="email" type="email" autoComplete="username" placeholder="name@acme.com" required />
          <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
          <div className="grid">
            <Button type="submit" pendingLabel={busy ? "Signing in…" : undefined}>Sign in</Button>
          </div>
        </Form>
      </Panel>
    </PageContainer>
  );
}
