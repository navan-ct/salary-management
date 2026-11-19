import { Badge, Layers, MapPin, Pencil } from "lucide-react";
import { type ReactElement, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { Button, TextLink } from "../../../shared/components/Button";
import { DataTable, type TableColumn } from "../../../shared/components/DataTable";
import { Notice, StatePanel } from "../../../shared/components/Feedback";
import { PageHeader } from "../../../shared/components/Layout";
import { SalaryAmount } from "../../../shared/components/SalaryAmount";
import { useApiRequest } from "../../../shared/hooks/use-api-request";
import { type SalaryChange, getEmployeeRecord } from "../api/employees";
import { SalarySummary } from "../components/SalarySummary";
import { formatSavedAt } from "../utils/format";
import { employeeRecordPath, employeeRecordState } from "../utils/record-navigation";

const historyColumns: readonly TableColumn<SalaryChange>[] = [
  {
    id: "date", header: "Saved date and time",
    render: ({ savedAt }) => <time dateTime={savedAt}>{formatSavedAt(savedAt)}</time>,
  },
  {
    id: "previous", header: "Previous salary", numeric: true,
    render: ({ previousAmount, previousCurrencyCode, previousMinorUnits }) =>
      <SalaryAmount amount={previousAmount} currency={previousCurrencyCode} minorUnits={previousMinorUnits} />,
  },
  {
    id: "new", header: "New salary", numeric: true,
    render: ({ newAmount, newCurrencyCode, newMinorUnits }) => <SalaryAmount amount={newAmount} currency={newCurrencyCode} minorUnits={newMinorUnits} />,
  },
  { id: "reason", header: "Reason", render: ({ reason }) => reason },
  { id: "editor", header: "Saved by", render: ({ editorName }) => editorName },
];

export function EmployeeRecordPage({ onSessionExpired }: { onSessionExpired: () => void }): ReactElement {
  const { employeeId = "" } = useParams();
  const navigate = useNavigate();
  const { directorySearch, salarySaved } = employeeRecordState(useLocation().state);
  const directory = `/employees${directorySearch}`;
  const back = { label: "Employee directory", to: directory };
  const load = useCallback((signal: AbortSignal) => getEmployeeRecord(employeeId, signal), [employeeId]);
  const { result, retry } = useApiRequest(load, onSessionExpired);
  const confirmation = salarySaved ? <Notice title="Salary change saved" tone="success" announce /> : null;

  switch (result.status) {
    case "loading":
      return <StatePanel state="loading" title="Loading employee record…" />;
    case "missing":
      return <StatePanel state="empty" title="Employee record unavailable" description="We couldn’t find this employee."
        action={<TextLink to={directory}>{back.label}</TextLink>} />;
    case "error":
      return (
        <>
          <PageHeader title="Employee record" back={back} />
          {confirmation}
          <StatePanel state="error" title="Couldn’t load the employee record" description="Try loading the record again."
            action={<Button variant="secondary" onClick={retry}>Retry</Button>} />
        </>
      );
    case "ready": {
      const { employee, history } = result.data;
      return (
        <>
          <PageHeader title={employee.fullName} back={back} description={
            <dl className="record-meta">
              <div><dt><Badge aria-hidden="true" className="size-icon" /><span className="sr-only">Employee ID</span></dt><dd>{employee.employeeId}</dd></div>
              <div><dt><MapPin aria-hidden="true" className="size-icon" /><span className="sr-only">Country</span></dt><dd>{employee.countryName}</dd></div>
              <div><dt><Layers aria-hidden="true" className="size-icon" /><span className="sr-only">Department</span></dt><dd>{employee.departmentName}</dd></div>
            </dl>
          } />
          {confirmation}
          <SalarySummary employee={employee} action={
            <Button onClick={() => {
              void navigate(`${employeeRecordPath(employeeId)}/change-salary`, { state: { directorySearch } });
            }}><Pencil aria-hidden="true" className="size-icon" />Change salary</Button>
          } />
          <section className="grid min-w-0 gap-lg" aria-labelledby="salary-history">
            <h2 id="salary-history" className="text-heading font-semibold">Salary history</h2>
            {history.length === 0
              ? <p className="table-panel px-lg py-xl text-muted">No salary changes have been recorded for this employee.</p>
              : <DataTable caption="Salary history" rows={history} columns={historyColumns} getRowKey={({ salaryVersion }) => salaryVersion} />}
          </section>
        </>
      );
    }
  }
}
