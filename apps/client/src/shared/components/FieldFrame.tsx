import { Field } from "@base-ui/react/field";
import { type ReactElement, type ReactNode } from "react";

export interface FieldFeedback {
  label: string;
  name: string;
  description?: string | undefined;
  error?: string | undefined;
  disabled?: boolean | undefined;
}

export function FieldFrame({ label, name, description, error, disabled, children }: FieldFeedback & { children: ReactNode }): ReactElement {
  return (
    <Field.Root name={name} disabled={disabled} invalid={error ? true : undefined} className="grid min-w-0 content-start gap-xs">
      <Field.Label className="text-body font-semibold">{label}</Field.Label>
      {children}
      {description && <Field.Description className="text-caption text-muted">{description}</Field.Description>}
      {error
        ? <Field.Error match className="text-caption font-medium text-danger">{error}</Field.Error>
        : <Field.Error className="text-caption font-medium text-danger" />}
    </Field.Root>
  );
}
