export function employeeRecordPath(employeeId: string): string {
  return `/employees/${encodeURIComponent(employeeId)}`;
}

export function employeeRecordState(state: unknown) {
  if (typeof state !== "object" || state === null) {
    return { directorySearch: "", salarySaved: false };
  }

  const search = "directorySearch" in state ? state.directorySearch : undefined;
  return {
    directorySearch: typeof search === "string" && search.startsWith("?") ? search : "",
    salarySaved: "salarySaved" in state && state.salarySaved === true,
  };
}
