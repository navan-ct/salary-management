import { Field } from "@base-ui/react/field";
import { Input } from "@base-ui/react/input";
import { Search } from "lucide-react";
import { type ReactElement, type Ref, useRef } from "react";

import { Button } from "./Button";
import { type FieldFeedback, FieldFrame } from "./FieldFrame";

type TextControl = FieldFeedback & {
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  required?: boolean | undefined;
  validate?: Field.Root.Props["validate"];
  readOnly?: boolean | undefined;
  ref?: Ref<HTMLElement> | undefined;
};

type TextFieldProps = TextControl & {
  type?: "text" | "email" | "password";
  autoComplete?: "email" | "username" | "current-password" | "off";
  inputMode?: "text" | "decimal";
};

export function TextField({
  label, name, description, error, disabled, value, defaultValue, onValueChange,
  placeholder, required, validate, readOnly, ref, type = "text", autoComplete, inputMode,
}: TextFieldProps): ReactElement {
  return (
    <FieldFrame label={label} name={name} description={description} error={error} disabled={disabled} validate={validate}>
      <Input
        ref={ref}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        placeholder={placeholder}
        required={validate ? undefined : required}
        aria-required={validate ? required : undefined}
        readOnly={readOnly}
        className="h-control field-control read-only:bg-canvas"
      />
    </FieldFrame>
  );
}

export function TextareaField({
  label, name, description, error, disabled, value, defaultValue, onValueChange, placeholder, required, validate, readOnly, ref,
}: TextControl): ReactElement {
  return (
    <FieldFrame label={label} name={name} description={description} error={error} disabled={disabled} validate={validate}>
      <Field.Control
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        placeholder={placeholder}
        required={validate ? undefined : required}
        aria-required={validate ? required : undefined}
        readOnly={readOnly}
        className="min-h-textarea resize-y py-sm field-control read-only:bg-canvas"
        render={<textarea />}
      />
    </FieldFrame>
  );
}

type SearchFieldProps = FieldFeedback & {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export function SearchField({ label, name, description, error, disabled, value, onValueChange, placeholder }: SearchFieldProps): ReactElement {
  const inputRef = useRef<HTMLElement>(null);

  function clearSearch() {
    onValueChange("");
    inputRef.current?.focus();
  }

  return (
    <FieldFrame label={label} name={name} description={description} error={error} disabled={disabled}>
      <div className="flex flex-wrap items-center gap-sm">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-md my-auto size-icon text-muted" />
          <Input
            ref={inputRef}
            type="search"
            autoComplete="off"
            value={value}
            onValueChange={onValueChange}
            placeholder={placeholder}
            className="h-control ps-2xl field-control search-control"
          />
        </div>
        {value && <Button variant="quiet" onClick={clearSearch} disabled={disabled}>Clear search</Button>}
      </div>
    </FieldFrame>
  );
}
