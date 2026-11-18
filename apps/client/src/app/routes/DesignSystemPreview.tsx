import { type ReactElement, useRef, useState } from "react";

import { ActionDialog } from "../../shared/components/ActionDialog";
import { Button, TextLink } from "../../shared/components/Button";
import { DataTable, Pagination, type TableColumn } from "../../shared/components/DataTable";
import { Notice, StatePanel } from "../../shared/components/Feedback";
import { Form, FormActions } from "../../shared/components/Form";
import { AppShell, DetailList, PageContainer, PageHeader, Panel } from "../../shared/components/Layout";
import { SelectField } from "../../shared/components/SelectField";
import { SearchField, TextareaField, TextField } from "../../shared/components/TextField";

const countries = [
  { value: "all", label: "All countries" }, { value: "in", label: "India" }, { value: "ca", label: "Canada" },
];
const resultStates = [
  { value: "ready", label: "Results" }, { value: "loading", label: "Loading" },
  { value: "empty", label: "Empty" }, { value: "error", label: "Load error" },
] as const;

const employees = [
  { id: "AC-00017", name: "Aarav Menon", country: "India", department: "Engineering", salary: "INR 1,650,000.00" },
  { id: "AC-00042", name: "Aditi Sharma", country: "India", department: "Engineering", salary: "INR 1,800,000.00" },
  { id: "AC-00314", name: "Aisha Khan", country: "Canada", department: "People Operations", salary: "CAD 92,000.00" },
  { id: "AC-00090", name: "Alex Chen", country: "Canada", department: "Engineering", salary: "CAD 112,500.00" },
];

const employeeColumns: readonly TableColumn<(typeof employees)[number]>[] = [
  {
    id: "name", header: "Employee name", rowHeader: true,
    render: (row) => row.id === "AC-00042" ? <TextLink href="#record">{row.name}</TextLink> : row.name,
  },
  { id: "id", header: "Employee ID", render: (row) => row.id },
  { id: "country", header: "Country", render: (row) => row.country },
  { id: "department", header: "Department", render: (row) => row.department },
  { id: "salary", header: "Current annual base salary", numeric: true, render: (row) => row.salary },
];

function DirectoryPreview(): ReactElement {
  const [query, setQuery] = useState("Aditi");
  const [country, setCountry] = useState<string | null>("in");
  const [department, setDepartment] = useState<string | null>("all");
  const [state, setState] = useState<(typeof resultStates)[number]["value"] | null>("ready");
  const [page, setPage] = useState(1);
  const term = query.trim().toLowerCase();
  const selectedCountry = countries.find(({ value }) => value === country)?.label;
  const matches = employees.filter((employee) =>
    (employee.name.toLowerCase().includes(term) || employee.id.toLowerCase() === term) &&
    (country === "all" || employee.country === selectedCountry) &&
    (department === "all" || employee.department === department),
  );
  const pageSize = 2;
  const rows = matches.slice((page - 1) * pageSize, page * pageSize);

  function clearFilters() {
    setQuery("");
    setCountry("all");
    setDepartment("all");
    setPage(1);
  }

  return (
    <section id="employees" className="grid min-w-0 gap-lg">
      <Panel title="Employee directory">
        <SearchField label="Employee name or ID" name="employee" value={query} onValueChange={(value) => {
          setQuery(value); setPage(1);
        }} placeholder="e.g. Aditi Sharma or AC-00042" />
        <div className="grid gap-md sm:grid-cols-3">
          <SelectField label="Country" name="country" options={countries} value={country} onValueChange={(value) => {
            setCountry(value); setPage(1);
          }} />
          <SelectField label="Department" name="department" options={[
            { value: "all", label: "All departments" }, { value: "Engineering", label: "Engineering" },
            { value: "People Operations", label: "People Operations" },
          ]} value={department} onValueChange={(value) => {
            setDepartment(value); setPage(1);
          }} />
          <SelectField label="Preview result state" name="directory-state" options={resultStates} value={state} onValueChange={setState} />
        </div>
        <FormActions><Button variant="quiet" onClick={clearFilters}>Clear all</Button></FormActions>
      </Panel>
      {state === "loading" && <StatePanel state="loading" title="Loading employees…" />}
      {state === "error" && (
        <StatePanel state="error" title="Couldn’t load employees" description="Try loading the directory again."
          action={<Button variant="secondary" onClick={() => {
            setState("ready");
          }}>Retry</Button>}
        />
      )}
      {(state === "empty" || (state === "ready" && rows.length === 0)) && (
        <StatePanel state="empty" title="No matching employees" description="Try another name or employee ID, or clear one or more filters." />
      )}
      {state === "ready" && rows.length > 0 && (
        <>
          <DataTable caption="Employees" rows={rows} columns={employeeColumns} getRowKey={(row) => row.id} />
          <Pagination page={page} pageCount={Math.ceil(matches.length / pageSize)} onPageChange={setPage}
            summary={`Showing ${String((page - 1) * pageSize + 1)}–${String((page - 1) * pageSize + rows.length)} of ${String(matches.length)} employees`}
          />
        </>
      )}
    </section>
  );
}

const recovery = {
  failure: { title: "Salary change wasn’t saved", description: "Your draft is available. You can try saving it again." },
  conflict: { title: "Another manager saved a change", description: "Reload the record to review the latest salary before starting a new change." },
  unknown: { title: "We couldn’t confirm the save", description: "Reload the record and check the current salary and history before trying again." },
};

const saveOutcomes = [
  { value: "failure", label: "Confirmed failure" },
  { value: "conflict", label: "Concurrent change" },
  { value: "unknown", label: "Unknown outcome" },
  { value: "success", label: "Confirmed save" },
  { value: "pending", label: "Save pending" },
] as const;
const salaryFormat = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function SalaryPreview(): ReactElement {
  const [scenario, setScenario] = useState<(typeof saveOutcomes)[number]["value"]>("failure");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currency, setCurrency] = useState<string | null>("USD");
  const [amount, setAmount] = useState("29500.005");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(true);
  const [saved, setSaved] = useState<{ amount: string; reason: string } | null>(null);
  const saveButton = useRef<HTMLElement>(null);
  const amountError = !/^\d+(?:\.\d{1,2})?$/u.test(amount) || !/[1-9]/u.test(amount)
    ? "Enter an amount greater than 0 with up to 2 decimal places."
    : undefined;
  const reasonError = reason.trim() === "" ? "Enter a reason for this change." : undefined;
  const pending = scenario === "pending";
  const recoveryMessage = scenario === "success" || pending ? null : recovery[scenario];

  function confirmSave() {
    if (currency !== null) {
      setSaved({ amount: `${currency} ${salaryFormat.format(amount as Intl.StringNumericLiteral)}`, reason });
      setDialogOpen(false);
    }
  }

  function submitDraft() {
    setSubmitted(true);
    if (amountError || reasonError) {
      return;
    }
    if (scenario === "success") {
      confirmSave();
    } else {
      setDialogOpen(true);
    }
  }

  function resetDraft() {
    setCurrency("INR");
    setAmount("");
    setReason("");
    setSubmitted(false);
  }

  return (
    <section id="record" className="grid min-w-0 gap-lg">
      <Panel title="Aditi Sharma">
        {saved && <Notice tone="success" title="Salary change saved" announce />}
        <DetailList details={[
          { label: "Employee ID", value: "AC-00042" }, { label: "Country", value: "India" },
          { label: "Department", value: "Engineering" },
          { label: "Current annual base salary", value: saved?.amount ?? "INR 1,800,000.00", emphasis: true },
        ]} />
      </Panel>
      <Panel title="Change salary">
        <SelectField label="Preview save outcome" name="save-outcome" value={scenario} options={saveOutcomes} onValueChange={(value) => {
          if (value !== null) {
            setScenario(value);
          }
        }} />
        <Form onSubmit={submitDraft} busy={pending}>
          <div className="grid gap-md sm:grid-cols-2">
            <SelectField label="Currency" name="currency" value={currency} required
              options={[{ value: "INR", label: "INR · Indian rupee" }, { value: "USD", label: "USD · US dollar" }]}
              onValueChange={(value) => {
                setCurrency(value);
                setAmount("");
              }}
              disabled={pending}
            />
            <TextField label="Annual base salary" name="salary" inputMode="decimal" value={amount} onValueChange={setAmount}
              description="Use up to 2 decimal places." error={submitted ? amountError : undefined} required readOnly={pending}
            />
          </div>
          <TextareaField label="Reason for change" name="reason" value={reason} onValueChange={setReason}
            error={submitted ? reasonError : undefined} required readOnly={pending}
          />
          <FormActions>
            <Button ref={saveButton} type="submit" pendingLabel={pending ? "Saving salary change…" : undefined}>Save salary change</Button>
            <Button variant="secondary" onClick={resetDraft} disabled={pending}>Cancel</Button>
          </FormActions>
        </Form>
        {recoveryMessage && (
          <ActionDialog open={dialogOpen} title={recoveryMessage.title} description={recoveryMessage.description}
            returnFocus={saveButton}
            primary={scenario === "failure" ? { label: "Retry save", onClick: confirmSave } : {
              label: "Reload employee record",
              onClick: () => {
                setDialogOpen(false);
                resetDraft();
              },
            }}
            dismiss={scenario === "failure" ? { label: "Back to draft", onClick: () => {
              setDialogOpen(false);
            } } : undefined}
          />
        )}
      </Panel>
      <Panel title="Salary history">
        {saved ? <DetailList details={[
          { label: "Previous base salary", value: "INR 1,800,000.00" },
          { label: "New base salary", value: saved.amount },
          { label: "Reason", value: saved.reason },
          { label: "Saved by", value: "Devika Rao" },
        ]} /> : <p className="text-muted">No salary changes have been recorded for this employee.</p>}
      </Panel>
    </section>
  );
}

const reportRows = [
  { group: "Canada", currency: "CAD", headcount: "1,900", median: "CAD 89,500.00" },
  { group: "India", currency: "INR", headcount: "4,129", median: "INR 1,385,000.00" },
  { group: "India", currency: "USD", headcount: "71", median: "USD 38,000.00" },
];
const reportColumns: readonly TableColumn<(typeof reportRows)[number]>[] = [
  { id: "group", header: "Country", rowHeader: true, render: (row) => row.group },
  { id: "currency", header: "Currency", render: (row) => row.currency },
  { id: "headcount", header: "Headcount", numeric: true, render: (row) => row.headcount },
  { id: "median", header: "Median annual base salary", numeric: true, render: (row) => row.median },
];

export default function DesignSystemPreview(): ReactElement {
  const [signedOut, setSignedOut] = useState(false);

  return (
    <AppShell navigation={[
      { label: "Employees", href: "#employees", active: true }, { label: "Pay insights", href: "#pay-insights" },
    ]} account={signedOut ? undefined : { name: "Devika Rao", onSignOut: () => {
      setSignedOut(true);
      window.location.hash = "sign-in";
    } }}>
      <PageContainer>
        <PageHeader title="Design system preview" description="Development examples using fictional records." />
        <DirectoryPreview />
        <SalaryPreview />
        <section id="pay-insights" className="grid min-w-0 gap-lg">
          <Panel title="Pay insights by country">
            <DataTable caption="Pay insights by country" rows={reportRows} columns={reportColumns} getRowKey={(row) => `${row.group}-${row.currency}`} />
          </Panel>
        </section>
        <section id="sign-in" className="grid w-full max-w-form gap-lg">
          <Panel title="Sign in">
            <Notice tone="warning" title="Your session expired">Sign in again to access salary data.</Notice>
            <Form onSubmit={() => {
              setSignedOut(false);
            }}>
              <TextField label="Work email" name="email" type="email" autoComplete="username" placeholder="name@acme.com" required />
              <TextField label="Password" name="password" type="password" autoComplete="current-password" required />
              <div><Button type="submit">Sign in</Button></div>
            </Form>
          </Panel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
