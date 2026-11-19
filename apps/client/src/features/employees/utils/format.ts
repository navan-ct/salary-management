const wholeNumber = new Intl.NumberFormat("en");
const savedDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const savedTime = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
});

export function formatSalary(amount: string, currencyCode: string, minorUnits: number): string {
  const [whole = "0", fraction = ""] = amount.split(".");
  const decimals = fraction.padEnd(minorUnits, "0");

  return `${currencyCode} ${wholeNumber.format(BigInt(whole))}${decimals ? `.${decimals}` : ""}`;
}

export function formatSavedAt(isoTimestamp: string): string {
  const instant = new Date(isoTimestamp);
  return `${savedDate.format(instant)} · ${savedTime.format(instant)}`;
}
