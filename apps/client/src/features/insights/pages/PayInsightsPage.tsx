import { type ReactElement, useCallback, useState } from "react";

import { Button } from "../../../shared/components/Button";
import { DataTable, type TableColumn } from "../../../shared/components/DataTable";
import { StatePanel } from "../../../shared/components/Feedback";
import { PageHeader } from "../../../shared/components/Layout";
import { SelectField } from "../../../shared/components/SelectField";
import { useApiRequest } from "../../../shared/hooks/use-api-request";
import { formatSalary } from "../../../shared/utils/format-salary";
import { type Country, type ReportRow, getCountryReport, getDepartmentRows } from "../api/insights";

const allCountries = { value: "all", label: "All countries" };
const countFormat = new Intl.NumberFormat("en");

export function PayInsightsPage({ onSessionExpired }: { onSessionExpired: () => void }): ReactElement {
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<Country>();
  const load = useCallback(async (signal: AbortSignal) => {
    if (country !== undefined) {
      return getDepartmentRows(country.code, signal);
    }

    const report = await getCountryReport(signal);
    if (!signal.aborted) {
      setCountries(report.countries);
    }
    return report.rows;
  }, [country]);
  const { result, retry } = useApiRequest(load, onSessionExpired);

  const options = [allCountries, ...countries.map(({ code, name }) => ({ value: code, label: name }))];
  const scope = country === undefined ? "By country" : `By department in ${country.name}`;
  const columns: readonly TableColumn<ReportRow>[] = [
    { id: "group", header: country === undefined ? "Country" : "Department", rowHeader: true, render: ({ groupName }) => groupName },
    { id: "currency", header: "Currency", render: ({ salaryCurrencyCode }) => salaryCurrencyCode },
    { id: "headcount", header: "Headcount", numeric: true, render: ({ headcount }) => countFormat.format(headcount) },
    {
      id: "median", header: "Median annual base salary", numeric: true,
      render: ({ medianAnnualBaseSalary, salaryCurrencyCode, salaryMinorUnits }) =>
        formatSalary(medianAnnualBaseSalary, salaryCurrencyCode, salaryMinorUnits),
    },
  ];

  let report: ReactElement;
  if (result.status === "ready") {
    report = result.data.length === 0 ? (
      <StatePanel state="empty" title="No employee records" description="There are no employee records to report for this view." />
    ) : (
      <DataTable caption={`Pay insights · ${scope}`} columns={columns} rows={result.data}
        getRowKey={({ groupId, salaryCurrencyCode }) => `${String(groupId)}-${salaryCurrencyCode}`} />
    );
  } else if (result.status === "loading") {
    report = <StatePanel state="loading" title="Loading pay insights…" />;
  } else {
    report = (
      <StatePanel state="error" title="Couldn’t load pay insights" description="Try loading this view again."
        action={<Button onClick={retry}>Retry</Button>} />
    );
  }

  return (
    <>
      <PageHeader title="Pay insights" />
      <section aria-labelledby="pay-insights-scope" className="grid min-w-0 gap-lg">
        <div className="flex flex-wrap items-center justify-between gap-md">
          <h2 id="pay-insights-scope" className="text-heading font-semibold">{scope}</h2>
          <div className="w-full sm:w-menu">
            <SelectField label="Country" name="country" value={country?.code ?? allCountries.value} options={options}
              onValueChange={(code) => {
                setCountry(countries.find((option) => option.code === code));
              }} />
          </div>
        </div>
        {report}
      </section>
    </>
  );
}
