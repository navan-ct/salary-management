const wholeNumber = new Intl.NumberFormat("en");

export function formatSalaryAmount(amount: string, minorUnits: number): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  const decimals = fraction.padEnd(minorUnits, "0");

  return `${wholeNumber.format(BigInt(whole))}${decimals ? `.${decimals}` : ""}`;
}
