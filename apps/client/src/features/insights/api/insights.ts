import { getJson } from "../../../shared/api/http";

export interface Country { code: string; name: string }

interface SalaryMetrics {
  salaryCurrencyCode: string;
  salaryMinorUnits: number;
  headcount: number;
  medianAnnualBaseSalary: string;
}

export interface ReportRow extends SalaryMetrics { groupId: string | number; groupName: string }

interface CountryReport {
  countries: Country[];
  rows: (SalaryMetrics & { countryCode: string; countryName: string })[];
}

interface DepartmentReport {
  rows: (SalaryMetrics & { departmentId: number; departmentName: string })[];
}

const countriesPath = "/api/insights/countries";

export async function getCountryReport(signal: AbortSignal) {
  const { countries, rows } = await getJson<CountryReport>(countriesPath, signal);
  return {
    countries,
    rows: rows.map(({ countryCode, countryName, ...metrics }): ReportRow =>
      ({ groupId: countryCode, groupName: countryName, ...metrics })),
  };
}

export async function getDepartmentRows(countryCode: string, signal: AbortSignal) {
  const path = `${countriesPath}/${encodeURIComponent(countryCode)}/departments`;
  const { rows } = await getJson<DepartmentReport>(path, signal);
  return rows.map(({ departmentId, departmentName, ...metrics }): ReportRow =>
    ({ groupId: departmentId, groupName: departmentName, ...metrics }));
}
