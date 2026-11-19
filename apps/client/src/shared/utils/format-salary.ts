const wholeNumber = new Intl.NumberFormat("en");

export function formatSalary(amount: string, currencyCode: string, minorUnits: number): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  const decimals = fraction.padEnd(minorUnits, "0");

  return `${currencyCode} ${wholeNumber.format(BigInt(whole))}${decimals ? `.${decimals}` : ""}`;
}
