import { ArrowLeft, type LucideIcon } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";
import { Link } from "react-router";

import { Button } from "./Button";

export function PageContainer({ children, narrow = false }: { children: ReactNode; narrow?: boolean }): ReactElement {
  return (
    <main id="main-content" tabIndex={-1} className={narrow ? "mx-auto grid w-full max-w-form content-start gap-xl px-lg py-3xl" : "page-layout"}>
      {children}
    </main>
  );
}

export function Initials({ name, round = false }: { name: string; round?: boolean }): ReactElement {
  const parts = name.trim().split(/\s+/u);
  const first = Array.from(parts[0] ?? "")[0] ?? "";
  const last = parts.length > 1 ? Array.from(parts.at(-1) ?? "")[0] ?? "" : "";
  return <span aria-hidden="true" className={round ? "initials account-initials" : "initials"}>{(first + last).toUpperCase()}</span>;
}

export function Brand(): ReactElement {
  return <p className="inline-flex items-center gap-md"><span className="wordmark">ACME</span>{" "}<span className="brand-name">Salary Management</span></p>;
}

export function CanopyPattern(): ReactElement {
  return (
    <div aria-hidden="true" className="canopy-pattern">
      <div><span /><span /><span /><span /><span /><span /><span /><span /></div>
    </div>
  );
}

interface NavigationItem { label: string; href: string; icon: LucideIcon; active?: boolean; current?: boolean }

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
        <div className="shell-inner shell-bar">
          <Brand />
          {navigation && (
            <nav aria-label="Main navigation" className="flex flex-wrap gap-xs">
              {navigation.map(({ label, href, icon: Icon, active, current }) => (
                <a
                  key={href}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-control items-center gap-sm rounded-control px-md font-medium focus-ring motion-safe:transition-colors ${
                    active || current ? "bg-brand-soft text-brand" : "text-muted hover:bg-subtle hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-icon shrink-0" />{label}
                </a>
              ))}
            </nav>
          )}
          {account && (
            <div className="account">
              <Initials name={account.name} round />
              <span className="account-name">{account.name}</span>
              <Button variant="quiet" onClick={account.onSignOut} pendingLabel={account.signingOut ? "Signing out…" : undefined}>
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
  back?: { label: string; to: string };
  actions?: ReactNode;
}

export function PageHeader({ title, description, back, actions }: PageHeaderProps): ReactElement {
  return (
    <header className="page-masthead">
      <CanopyPattern />
      <div className="shell-inner masthead-copy">
        {back && (
          <Link to={back.to} className="inline-flex items-center gap-sm justify-self-start rounded-control text-caption font-semibold text-on-forest-muted hover:underline focus-ring">
            <ArrowLeft aria-hidden="true" className="size-icon shrink-0" />
            {back.label}
          </Link>
        )}
        <h1 className="text-title font-semibold tracking-title wrap-break-word">{title}</h1>
        {description && <div className="text-body text-on-forest-muted">{description}</div>}
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
          <dd className={emphasis ? "text-amount font-semibold tracking-title tabular-nums" : "text-body font-medium"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
