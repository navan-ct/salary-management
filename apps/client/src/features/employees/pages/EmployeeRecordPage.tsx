import { type ReactElement, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router";

import { Button, TextLink } from "../../../shared/components/Button";
import { DataTable, type TableColumn } from "../../../shared/components/DataTable";
import { Notice, StatePanel } from "../../../shared/components/Feedback";
import { DetailList, PageHeader, Panel } from "../../../shared/components/Layout";
import { type SalaryChange, getEmployeeRecord } from "../api/employees";
import { useEmployeeRequest } from "../hooks/use-employee-request";
import { formatSalary, formatSavedAt } from "../utils/format";
import { employeeRecordPath, employeeRecordState } from "../utils/record-navigation";

const historyColumns: readonly TableColumn<SalaryChange>[] = [
  {
    id: "date", header: "Saved date and time",
    render: ({ savedAt }) => <time dateTime={savedAt}>{formatSavedAt(savedAt)}</time>,
  },
  {
    id: "previous", header: "Previous salary", numeric: true,
    render: ({ previousAmount, previousCurrencyCode, previousMinorUnits }) =>
      formatSalary(previousAmount, previousCurrencyCode, previousMinorUnits),
  },
  {
    id: "new", header: "New salary", numeric: true,
    render: ({ newAmount, newCurrencyCode, newMinorUnits }) => formatSalary(newAmount, newCurrencyCode, newMinorUnits),
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
  const { result, retry } = useEmployeeRequest(load, onSessionExpired);
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
          <PageHeader title={employee.fullName} back={back} />
          {confirmation}
          <Panel>
            <DetailList details={[
              { label: "Employee ID", value: employee.employeeId },
              { label: "Country", value: employee.countryName },
              { label: "Department", value: employee.departmentName },
            ]} />
            <div className="border-t border-line" />
            <div className="flex flex-wrap items-center justify-between gap-lg">
              <DetailList details={[{
                label: "Current annual base salary",
                value: formatSalary(employee.annualBaseSalary, employee.salaryCurrencyCode, employee.salaryMinorUnits),
                emphasis: true,
              }]} />
              <Button onClick={() => {
                void navigate(`${employeeRecordPath(employeeId)}/change-salary`, { state: { directorySearch } });
              }}>Change salary</Button>
            </div>
          </Panel>
          <Panel title="Salary history">
            {history.length === 0
              ? <p className="text-muted">No salary changes have been recorded for this employee.</p>
              : <DataTable caption="Salary history" rows={history} columns={historyColumns} getRowKey={({ salaryVersion }) => salaryVersion} />}
          </Panel>
        </>
      );
    }
  }
}
