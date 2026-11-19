import { type ReactElement, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { ActionDialog } from "../../../shared/components/ActionDialog";
import { Button } from "../../../shared/components/Button";
import { Notice, StatePanel } from "../../../shared/components/Feedback";
import { Form, FormActions } from "../../../shared/components/Form";
import { PageHeader } from "../../../shared/components/Layout";
import { SelectField } from "../../../shared/components/SelectField";
import { TextField, TextareaField } from "../../../shared/components/TextField";
import { useApiRequest } from "../../../shared/hooks/use-api-request";
import { type EmployeeRecord, type SalaryFieldErrors, getEmployeeRecord, saveEmployeeSalary } from "../api/employees";
import { SalarySummary } from "../components/SalarySummary";
import { employeeRecordPath, employeeRecordState } from "../utils/record-navigation";

const currencyNames = new Intl.DisplayNames("en", { type: "currency", fallback: "none" });
const decimal = /^(?:\d+(?:\.\d+)?|\.\d+)$/u;

const recovery = {
  failure: { title: "Salary change wasn’t saved", description: "Your draft is available. You can try saving it again." },
  conflict: { title: "Another manager saved a change", description: "Reload the record to review the latest salary before starting a new change." },
  unknown: { title: "We couldn’t confirm the save", description: "Reload the record and check the current salary and history before trying again." },
};

type SaveState = "idle" | "saving" | "retrying" | keyof typeof recovery;

interface ChangeSalaryFormProps {
  employee: EmployeeRecord["employee"];
  currencies: EmployeeRecord["currencies"];
  onSaved: () => void;
  onLeave: () => void;
  onSessionExpired: () => void;
}

function validateReason(value: unknown) {
  if (typeof value !== "string" || !/[^\p{White_Space}\uFEFF]/u.test(value)) {
    return "Enter a reason for this change.";
  }
  if (value.includes("\0")) {
    return "Remove null characters from the reason.";
  }
  return undefined;
}

function ChangeSalaryForm({ employee, currencies, onSaved, onLeave, onSessionExpired }: ChangeSalaryFormProps): ReactElement {
  const [selectedCurrency, setSelectedCurrency] = useState({ code: employee.salaryCurrencyCode, minorUnits: employee.salaryMinorUnits });
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fieldErrors, setFieldErrors] = useState<SalaryFieldErrors>();
  const [formError, setFormError] = useState<string>();
  const saveButton = useRef<HTMLElement>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => {
    request.current?.abort();
  }, []);

  const { code, minorUnits } = selectedCurrency;
  const precision = minorUnits === 0 ? `${code} requires a whole amount.` : `${code} allows up to ${String(minorUnits)} decimal places.`;
  const amountHelp = code === employee.salaryCurrencyCode ? "Enter an amount greater than 0." : `Enter a new amount in ${code}.`;
  const pending = saveState === "saving" || saveState === "retrying";
  const recoveryKind = saveState === "conflict" || saveState === "unknown" ? saveState : "failure";

  function validateAmount(value: unknown) {
    const decimalAmount = typeof value === "string" ? value.trim() : "";
    if (!decimal.test(decimalAmount) || !/[1-9]/u.test(decimalAmount)) {
      return "Enter a valid decimal amount greater than 0.";
    }
    return (decimalAmount.split(".")[1]?.length ?? 0) > minorUnits ? precision : undefined;
  }

  function changeCurrency(nextCode: string | null) {
    const nextCurrency = currencies.find(({ code: option }) => option === nextCode);
    if (nextCurrency && nextCurrency.code !== code) {
      setSelectedCurrency(nextCurrency);
      setAmount("");
      setFormError(undefined);
    }
  }

  async function submitDraft() {
    if (request.current || (saveState !== "idle" && saveState !== "failure")) {
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    setSaveState(saveState === "failure" ? "retrying" : "saving");
    setFormError(undefined);
    setFieldErrors(undefined);

    const result = await saveEmployeeSalary(employee.employeeId, {
      annualBaseSalary: amount.trim(), salaryCurrencyCode: code, salaryVersion: employee.salaryVersion, reason,
    }, controller.signal).catch(() => ({ status: "unknown" as const }));
    if (controller.signal.aborted) {
      return;
    }

    request.current = null;
    switch (result.status) {
      case "saved":
        onSaved();
        return;
      case "expired":
        onSessionExpired();
        return;
      case "invalid":
        setFieldErrors(result.fields);
        setFormError(result.message);
        setSaveState("idle");
        return;
      case "failure":
      case "conflict":
      case "unknown":
        setSaveState(result.status);
    }
  }

  function save() {
    void submitDraft();
  }

  return (
    <>
      <PageHeader title="Change salary" description={`${employee.fullName} · ${employee.employeeId}`} />
      <SalarySummary employee={employee} />
      <Form onSubmit={save} busy={pending} errors={fieldErrors}>
        <div className="grid w-full max-w-editor gap-lg">
          {formError && <Notice tone="error" title={formError} announce />}
          <div className="w-full sm:w-menu">
            <SelectField label="Currency" name="salaryCurrencyCode" value={code} onValueChange={changeCurrency} disabled={pending} required
              options={currencies.map(({ code: value }) => {
                const name = currencyNames.of(value);
                return { value, label: name ? `${value} · ${name}` : value };
              })} />
          </div>
          <TextField label="Annual base salary" name="annualBaseSalary" inputMode="decimal" placeholder="Enter annual amount"
            value={amount} onValueChange={(value) => {
              setAmount(value);
              setFormError(undefined);
            }} description={`${amountHelp} ${precision}`} validate={validateAmount} required readOnly={pending} />
          <TextareaField label="Reason for change" name="reason" placeholder="Enter a reason" value={reason} validate={validateReason}
            onValueChange={(value) => {
              setReason(value);
              setFormError(undefined);
            }} required readOnly={pending} />
          <FormActions>
            <Button ref={saveButton} type="submit" disabled={amount === "" && reason === ""}
              pendingLabel={pending ? "Saving salary change…" : undefined}>Save salary change</Button>
            <Button variant="secondary" disabled={pending} onClick={onLeave}>Cancel</Button>
          </FormActions>
        </div>
      </Form>
      <ActionDialog open={saveState !== "idle" && saveState !== "saving"}
        title={recovery[recoveryKind].title} description={recovery[recoveryKind].description}
        primary={recoveryKind === "failure" ? { label: "Retry save", onClick: save } : { label: "Reload employee record", onClick: onLeave }}
        dismiss={recoveryKind === "failure" ? { label: "Back to draft", onClick: () => {
          setSaveState("idle");
        } } : undefined}
        pendingLabel={saveState === "retrying" ? "Saving salary change…" : undefined} returnFocus={saveButton} />
    </>
  );
}

export function ChangeSalaryPage({ onSessionExpired }: { onSessionExpired: () => void }): ReactElement {
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const { directorySearch } = employeeRecordState(useLocation().state);
  const load = useCallback((signal: AbortSignal) => getEmployeeRecord(employeeId, signal), [employeeId]);
  const { result, retry } = useApiRequest(load, onSessionExpired);

  function openRecord(salarySaved: boolean) {
    void navigate(employeeRecordPath(employeeId), { replace: true, state: { directorySearch, salarySaved } });
  }

  switch (result.status) {
    case "loading":
      return <StatePanel state="loading" title="Loading current salary…" />;
    case "missing":
      return <StatePanel state="empty" title="Employee record unavailable" description="We couldn’t find this employee."
        action={<Button variant="secondary" onClick={() => {
          void navigate(`/employees${directorySearch}`, { replace: true });
        }}>Employee directory</Button>} />;
    case "error":
      return (
        <>
          <PageHeader title="Change salary" />
          <StatePanel state="error" title="Couldn’t load the current salary" description="Try loading the salary again."
            action={<Button variant="secondary" onClick={retry}>Retry</Button>} />
        </>
      );
    case "ready":
      return <ChangeSalaryForm employee={result.data.employee} currencies={result.data.currencies} onSessionExpired={onSessionExpired}
        onSaved={() => {
          openRecord(true);
        }} onLeave={() => {
          openRecord(false);
        }} />;
  }
}
