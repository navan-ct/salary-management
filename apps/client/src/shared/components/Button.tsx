import { Button as BaseButton } from "@base-ui/react/button";
import { LoaderCircle } from "lucide-react";
import { type ReactElement, type ReactNode, type Ref } from "react";
import { Link } from "react-router";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean | undefined;
  focusableWhenDisabled?: boolean;
  pendingLabel?: string | undefined;
  ref?: Ref<HTMLElement>;
}

export function Button({
  children, variant = "primary", type = "button", onClick, disabled, focusableWhenDisabled = false, pendingLabel, ref,
}: ButtonProps): ReactElement {
  return (
    <BaseButton
      ref={ref}
      type={type}
      disabled={disabled === true || pendingLabel !== undefined}
      focusableWhenDisabled={focusableWhenDisabled || (disabled !== true && pendingLabel !== undefined)}
      aria-busy={pendingLabel !== undefined || undefined}
      onClick={onClick}
      className={`inline-flex min-h-control items-center justify-center gap-sm rounded-control border px-md py-xs text-body font-semibold focus-ring motion-safe:transition-colors disabled:cursor-not-allowed data-disabled:cursor-not-allowed data-disabled:border-line data-disabled:bg-subtle data-disabled:text-muted ${
        variant === "primary" ? "border-brand bg-brand text-on-brand not-data-disabled:hover:border-brand-hover not-data-disabled:hover:bg-brand-hover" :
          variant === "secondary" ? "border-control-line bg-surface text-ink not-data-disabled:hover:bg-subtle" :
            "border-transparent text-brand not-data-disabled:hover:bg-brand-soft"
      }`}
    >
      {pendingLabel === undefined ? children : (
        <>
          <LoaderCircle aria-hidden="true" className="size-icon shrink-0 motion-safe:animate-spin" />
          {pendingLabel}
        </>
      )}
    </BaseButton>
  );
}

interface TextLinkProps {
  to: string;
  state?: unknown;
  reloadDocument?: boolean;
  children: ReactNode;
  label?: string;
}

export function TextLink({ to, state, reloadDocument = false, children, label }: TextLinkProps): ReactElement {
  return (
    <Link to={to} state={state} reloadDocument={reloadDocument} aria-label={label}
      className="inline-flex items-center gap-sm rounded-control font-semibold text-brand hover:text-brand-hover hover:underline focus-ring">
      {children}
    </Link>
  );
}
