import { ArrowLeft } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";

import { Button } from "./Button";

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }): ReactElement {
  return (
    <main id="main-content" tabIndex={-1} className={`mx-auto grid w-full content-start gap-xl px-lg py-xl sm:px-xl sm:py-2xl ${narrow ? "max-w-form" : "max-w-page"}`}>
      {children}
    </main>
  );
}

interface NavigationItem { label: string; href: string; active?: boolean; current?: boolean }

interface AppShellProps {
  children: ReactNode;
  navigation?: readonly NavigationItem[];
  account?: { name: string; onSignOut: () => void; signingOut?: boolean } | undefined;
}

export function AppShell({ children, navigation, account }: AppShellProps): ReactElement {
  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:m-sm focus:inline-flex focus:rounded-control focus:bg-surface focus:px-md focus:py-sm focus-ring">
        Skip to main content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-sm px-lg py-sm sm:gap-xl sm:px-xl">
          <p className="font-semibold">ACME Salary Management</p>
          {navigation && (
            <nav aria-label="Main navigation" className="flex flex-wrap gap-xs">
              {navigation.map(({ label, href, active, current }) => (
                <a
                  key={href}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-control items-center rounded-control px-md font-semibold focus-ring motion-safe:transition-colors ${
                    active || current ? "bg-brand-soft text-brand" : "text-muted hover:bg-subtle hover:text-ink"
                  }`}
                >
                  {label}
                </a>
              ))}
            </nav>
          )}
          {account && (
            <div className="flex flex-wrap items-center gap-sm">
              <span className="text-muted">{account.name}</span>
              <Button variant="secondary" onClick={account.onSignOut} pendingLabel={account.signingOut ? "Signing out…" : undefined}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </header>
      {children}
    </>
  );
}

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  back?: { label: string; href: string };
  actions?: ReactNode;
}

export function PageHeader({ title, description, back, actions }: PageHeaderProps): ReactElement {
  return (
    <header className="grid gap-sm">
      {back && (
        <a href={back.href} className="inline-flex min-h-control items-center gap-sm justify-self-start rounded-control font-semibold text-brand underline hover:text-brand-hover focus-ring">
          <ArrowLeft aria-hidden="true" className="size-icon shrink-0" />
          {back.label}
        </a>
      )}
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="grid min-w-0 gap-xs">
          <h1 className="text-title font-semibold tracking-title wrap-break-word">{title}</h1>
          {description && <div className="text-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-sm">{actions}</div>}
      </div>
    </header>
  );
}

interface PanelProps { children: ReactNode; title?: string; actions?: ReactNode }

export function Panel({ children, title, actions }: PanelProps): ReactElement {
  return (
    <div className="grid min-w-0 gap-lg rounded-panel border border-line bg-surface p-lg shadow-raised sm:p-xl">
      {(title !== undefined || actions !== undefined) && (
        <div className="flex flex-wrap items-center justify-between gap-md">
          {title && <h2 className="text-heading font-semibold">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-sm">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

interface Detail { label: string; value: ReactNode; emphasis?: boolean }

export function DetailList({ details }: { details: readonly Detail[] }): ReactElement {
  return (
    <dl className="flex flex-wrap gap-x-2xl gap-y-lg">
      {details.map(({ label, value, emphasis }) => (
        <div key={label} className="grid min-w-0 gap-xs">
          <dt className="text-caption font-medium text-muted">{label}</dt>
          <dd className={emphasis ? "text-heading font-semibold tabular-nums" : "text-body font-medium"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
