import type { ReactElement } from "react";

import { formatSalaryAmount } from "../utils/format-salary";

export function SalaryAmount({ amount, currency, minorUnits }: { amount: string; currency: string; minorUnits: number }): ReactElement {
  return (
    <span className="font-semibold tabular-nums">
      <span className="currency-code">{currency}</span>{" "}{formatSalaryAmount(amount, minorUnits)}
    </span>
  );
}
