export interface Employee {
  employeeId: string;
  fullName: string;
  countryCode: string;
  countryName: string;
  departmentId: number;
  departmentName: string;
  annualBaseSalary: string;
  salaryCurrencyCode: string;
  salaryMinorUnits: number;
}

interface DirectoryResult {
  employees: Employee[];
  page: number;
  pageSize: number;
  total: number;
  countries: { code: string; name: string }[];
  departments: { id: number; name: string }[];
}

export interface SalaryChange {
  salaryVersion: number;
  savedAt: string;
  previousAmount: string;
  previousCurrencyCode: string;
  previousMinorUnits: number;
  newAmount: string;
  newCurrencyCode: string;
  newMinorUnits: number;
  reason: string;
  editorName: string;
}

export class EmployeeRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Employee request failed with status ${String(status)}.`);
    this.status = status;
  }
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new EmployeeRequestError(response.status);
  }

  return (await response.json()) as T;
}

export function getDirectory(query: string, signal: AbortSignal) {
  return get<DirectoryResult>(`/api/employees${query ? `?${query}` : ""}`, signal);
}

export async function getEmployeeRecord(employeeId: string, signal: AbortSignal) {
  const path = `/api/employees/${encodeURIComponent(employeeId)}`;
  const [{ employee }, { history }] = await Promise.all([
    get<{ employee: Employee }>(path, signal),
    get<{ history: SalaryChange[] }>(`${path}/salary-history`, signal),
  ]);

  return { employee, history };
}
