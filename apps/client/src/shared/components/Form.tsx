import { Form as BaseForm } from "@base-ui/react/form";
import { type ReactElement, type ReactNode, type SubmitEvent } from "react";

interface FormProps {
  children: ReactNode;
  onSubmit: (data: FormData) => void;
  onReset?: () => void;
  busy?: boolean;
  errors?: BaseForm.Props["errors"];
}

export function Form({ children, onSubmit, onReset, busy, errors }: FormProps): ReactElement {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!busy) {
      onSubmit(new FormData(event.currentTarget));
    }
  }

  return (
    <BaseForm onSubmit={handleSubmit} onReset={onReset} errors={errors} aria-busy={busy} className="grid gap-lg">
      {children}
    </BaseForm>
  );
}

export function FormActions({ children }: { children: ReactNode }): ReactElement {
  return <div className="flex flex-wrap items-center gap-sm">{children}</div>;
}
