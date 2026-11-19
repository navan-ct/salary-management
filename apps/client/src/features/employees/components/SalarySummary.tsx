import type { ReactElement, ReactNode } from "react";

import { DetailList } from "../../../shared/components/Layout";
import { SalaryAmount } from "../../../shared/components/SalaryAmount";
import type { Employee } from "../api/employees";

export function SalarySummary({ employee, action }: { employee: Employee; action?: ReactNode }): ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-lg border-b border-line py-lg">
      <DetailList details={[{
        label: "Current annual base salary",
        value: <SalaryAmount amount={employee.annualBaseSalary} currency={employee.salaryCurrencyCode} minorUnits={employee.salaryMinorUnits} />,
        emphasis: true,
      }]} />
      {action}
    </div>
  );
}
