import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { type ReactElement } from "react";

import { type FieldFeedback, FieldFrame } from "./FieldFrame";

export interface SelectOption<Value extends string> { value: Value; label: string; disabled?: boolean }

type SelectFieldProps<Value extends string> = FieldFeedback & {
  options: readonly SelectOption<Value>[];
  value?: Value | null;
  defaultValue?: Value | null;
  onValueChange?: (value: Value | null) => void;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
};

export function SelectField<Value extends string>({
  label, name, description, error, disabled, options, value, defaultValue, onValueChange, placeholder = "Select an option",
  required, readOnly,
}: SelectFieldProps<Value>): ReactElement {
  return (
    <FieldFrame label={label} name={name} description={description} error={error} disabled={disabled}>
      <Select.Root<Value>
        items={options}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        required={required}
        readOnly={readOnly}
        disabled={disabled === true || options.length === 0}
        modal={false}
      >
        <Select.Trigger className="flex min-h-control items-center justify-between gap-sm py-sm text-start field-control data-popup-open:not-data-invalid:border-brand">
          <Select.Value placeholder={options.length === 0 ? "No options available" : placeholder} className="min-w-0 truncate" />
          <Select.Icon>
            <ChevronDown aria-hidden="true" className="size-icon shrink-0 text-muted" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner align="start" alignItemWithTrigger={false} className="select-position">
            <Select.Popup className="rounded-control border border-line bg-surface p-xs shadow-overlay select-scroll">
              <Select.List>
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className="flex min-h-control cursor-default items-center justify-between gap-sm rounded-control px-sm py-xs text-body text-ink data-selected:font-semibold data-selected:text-brand data-highlighted:bg-brand-soft data-disabled:cursor-not-allowed data-disabled:text-muted"
                  >
                    <Select.ItemText className="min-w-0 wrap-break-word">{option.label}</Select.ItemText>
                    <Select.ItemIndicator>
                      <Check aria-hidden="true" className="size-icon shrink-0" />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </FieldFrame>
  );
}
