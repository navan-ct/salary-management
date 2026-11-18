import { CircleAlert, CircleCheck, Info, LoaderCircle, SearchX, TriangleAlert } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";

interface NoticeProps {
  title: string;
  children?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  announce?: boolean;
}

export function Notice({ title, children, tone = "info", announce = false }: NoticeProps): ReactElement {
  const Icon = { info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert }[tone];
  const role = tone === "error" ? "alert" : "status";

  return (
    <div
      role={announce ? role : undefined}
      className={`flex items-start gap-md rounded-control p-md ${
        tone === "success" ? "bg-success-soft text-success" : tone === "warning" ? "bg-warning-soft text-warning" :
          tone === "error" ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"
      }`}
    >
      <Icon aria-hidden="true" className="mt-xs size-icon shrink-0" />
      <div className="grid gap-xs">
        <p className="font-semibold">{title}</p>
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

type StatePanelProps = {
  title: string;
  description?: ReactNode;
} & ({ state: "loading"; action?: never } | { state: "empty" | "error"; action?: ReactNode });

export function StatePanel({ state, title, description, action }: StatePanelProps): ReactElement {
  const Icon = { loading: LoaderCircle, empty: SearchX, error: CircleAlert }[state];

  return (
    <div className="grid justify-items-center gap-md rounded-panel border border-line bg-surface px-lg py-2xl text-center sm:py-3xl">
      <div role={state === "error" ? "alert" : "status"} className="grid max-w-form justify-items-center gap-xs">
        <Icon aria-hidden="true" className={`mb-sm size-icon ${state === "loading" ? "text-brand motion-safe:animate-spin" : state === "error" ? "text-danger" : "text-muted"}`} />
        <p className="text-heading font-semibold">{title}</p>
        {description && <div className="text-muted">{description}</div>}
      </div>
      {action}
    </div>
  );
}
