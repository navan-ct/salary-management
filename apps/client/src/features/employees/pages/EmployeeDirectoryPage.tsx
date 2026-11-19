import type { ReactElement } from "react";

import { StatePanel } from "../../../shared/components/Feedback";
import { PageHeader } from "../../../shared/components/Layout";

export function EmployeeDirectoryPage(): ReactElement {
  return (
    <>
      <PageHeader title="Employee directory" />
      <StatePanel state="empty" title="No employees to display" />
    </>
  );
}
