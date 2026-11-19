const savedDate = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const savedTime = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZoneName: "short",
});

export function formatSavedAt(isoTimestamp: string): string {
  const instant = new Date(isoTimestamp);
  return `${savedDate.format(instant)} · ${savedTime.format(instant)}`;
}
