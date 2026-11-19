import { type ReactElement, useCallback } from "react";
import { useLocation, useSearchParams } from "react-router";

import { Button, TextLink } from "../../../shared/components/Button";
import { DataTable, Pagination, type TableColumn } from "../../../shared/components/DataTable";
import { StatePanel } from "../../../shared/components/Feedback";
import { PageHeader, Panel } from "../../../shared/components/Layout";
import { type SelectOption, SelectField } from "../../../shared/components/SelectField";
import { SearchField } from "../../../shared/components/TextField";
import { useApiRequest } from "../../../shared/hooks/use-api-request";
import { formatSalary } from "../../../shared/utils/format-salary";
import { type Employee, getDirectory } from "../api/employees";
import { employeeRecordPath } from "../utils/record-navigation";

const countFormat = new Intl.NumberFormat("en");

function filterOptions(allLabel: string, selected: string, options: SelectOption<string>[]) {
  const fallback = selected !== "all" && !options.some(({ value }) => value === selected)
    ? [{ value: selected, label: selected }] : [];
  return [{ value: "all", label: allLabel }, ...options, ...fallback];
}

export function EmployeeDirectoryPage({ onSessionExpired }: { onSessionExpired: () => void }): ReactElement {
  const { search: directorySearch } = useLocation();
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const country = params.get("countryCode") ?? "all";
  const department = params.get("departmentId") ?? "all";
  const load = useCallback((signal: AbortSignal) => getDirectory(directorySearch.slice(1), signal), [directorySearch]);
  const { result, latestData, retry } = useApiRequest(load, onSessionExpired, search ? 180 : 0);

  const countries = filterOptions("All countries", country,
    latestData?.countries.map(({ code, name }) => ({ value: code, label: name })) ?? []);
  const departments = filterOptions("All departments", department,
    latestData?.departments.map(({ id, name }) => ({ value: String(id), label: name })) ?? []);

  function changeFilter(name: "search" | "countryCode" | "departmentId", value: string | null) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    next.delete("page");
    setParams(next, { replace: true });
  }

  function changePage(page: number) {
    const next = new URLSearchParams(params);
    if (page === 1) {
      next.delete("page");
    } else {
      next.set("page", String(page));
    }
    setParams(next, { replace: true });
  }

  const columns: readonly TableColumn<Employee>[] = [
    {
      id: "name", header: "Employee name", rowHeader: true,
      render: ({ employeeId, fullName }) => (
        <TextLink to={employeeRecordPath(employeeId)} state={{ directorySearch }}>{fullName}</TextLink>
      ),
    },
    { id: "id", header: "Employee ID", render: ({ employeeId }) => employeeId },
    { id: "country", header: "Country", render: ({ countryName }) => countryName },
    { id: "department", header: "Department", render: ({ departmentName }) => departmentName },
    {
      id: "salary", header: "Current annual base salary", numeric: true,
      render: ({ annualBaseSalary, salaryCurrencyCode, salaryMinorUnits }) =>
        formatSalary(annualBaseSalary, salaryCurrencyCode, salaryMinorUnits),
    },
  ];

  let results: ReactElement;
  if (result.status === "ready") {
    const { employees, page, pageSize, total } = result.data;
    const start = (page - 1) * pageSize + 1;
    const end = start + employees.length - 1;
    results = employees.length === 0 ? (
      <StatePanel state="empty" title="No matching employees" description="Try another name or employee ID, or clear one or more filters." />
    ) : (
      <>
        <DataTable caption="Employees" rows={employees} columns={columns} getRowKey={({ employeeId }) => employeeId} />
        <Pagination page={page} pageCount={Math.ceil(total / pageSize)} onPageChange={changePage}
          summary={`Showing ${countFormat.format(start)}–${countFormat.format(end)} of ${countFormat.format(total)} employees`} />
      </>
    );
  } else if (result.status === "loading") {
    results = <StatePanel state="loading" title="Loading employees…" />;
  } else {
    results = <StatePanel state="error" title="Couldn’t load employees" description="Try loading the directory again."
      action={<Button variant="secondary" onClick={retry}>Retry</Button>} />;
  }

  return (
    <>
      <PageHeader title="Employee directory" />
      <Panel>
        <div className="grid gap-md sm:grid-cols-3">
          <SearchField label="Employee name or ID" name="search" value={search}
            placeholder="e.g. Aditi Sharma or AC-00042" onValueChange={(value) => {
              changeFilter("search", value);
            }} />
          <SelectField label="Country" name="country" value={country} options={countries} onValueChange={(value) => {
            changeFilter("countryCode", value === "all" ? null : value);
          }} />
          <SelectField label="Department" name="department" value={department} options={departments} onValueChange={(value) => {
            changeFilter("departmentId", value === "all" ? null : value);
          }} />
        </div>
        {(search || country !== "all" || department !== "all") && (
          <div className="flex flex-wrap gap-sm">
            <Button variant="quiet" onClick={() => {
              setParams({}, { replace: true });
            }}>Clear all</Button>
          </div>
        )}
      </Panel>
      {results}
    </>
  );
}
