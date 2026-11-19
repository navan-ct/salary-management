import { getJson } from "../../../shared/api/http";

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

export interface SalaryCurrency { code: string; minorUnits: number }

export interface EmployeeRecord {
  employee: Employee & { salaryVersion: number };
  history: SalaryChange[];
  currencies: SalaryCurrency[];
}

interface SalaryDraft {
  annualBaseSalary: string;
  salaryCurrencyCode: string;
  salaryVersion: number;
  reason: string;
}

const salaryFields = ["annualBaseSalary", "salaryCurrencyCode", "reason"] as const;
export type SalaryFieldErrors = Partial<Record<(typeof salaryFields)[number], string>>;

export type SalarySaveResult =
  | { status: "saved" | "expired" | "failure" | "conflict" | "unknown" }
  | { status: "invalid"; fields: SalaryFieldErrors; message?: string };

export function getDirectory(query: string, signal: AbortSignal) {
  return getJson<DirectoryResult>(`/api/employees${query ? `?${query}` : ""}`, signal);
}

export function getEmployeeRecord(employeeId: string, signal: AbortSignal) {
  return getJson<EmployeeRecord>(`/api/employees/${encodeURIComponent(employeeId)}`, signal);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function saveEmployeeSalary(employeeId: string, draft: SalaryDraft, signal: AbortSignal): Promise<SalarySaveResult> {
  const response = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/salary`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]),
  });

  if (response.status === 401) {
    return { status: "expired" };
  }

  const body: unknown = await response.json();
  if (response.ok && isObject(body) && body.salaryVersion === draft.salaryVersion + 1) {
    return { status: "saved" };
  }
  if (!isObject(body) || !isObject(body.error)) {
    return { status: "unknown" };
  }

  const { code, fields } = body.error;
  if (response.status === 400 && code === "INVALID_SALARY_DRAFT") {
    const errors: SalaryFieldErrors = {};
    if (isObject(fields)) {
      for (const field of salaryFields) {
        const message = fields[field];
        if (typeof message === "string") {
          errors[field] = message;
        }
      }
    }
    return Object.keys(errors).length > 0 ? { status: "invalid", fields: errors } : {
      status: "invalid", fields: {}, message: "Review the draft before trying again.",
    };
  }
  if (response.status === 400 && code === "SALARY_UNCHANGED") {
    return { status: "invalid", fields: {}, message: "Change the amount or currency before saving." };
  }
  if (response.status === 413 && code === "PAYLOAD_TOO_LARGE") {
    return { status: "invalid", fields: {}, message: "Shorten the reason or salary amount before saving." };
  }
  if (response.status === 409 && code === "SALARY_VERSION_CONFLICT") {
    return { status: "conflict" };
  }
  if (response.status === 500 && code === "SALARY_SAVE_FAILED") {
    return { status: "failure" };
  }

  return { status: "unknown" };
}
