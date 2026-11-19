import type { ReactElement } from "react";

import { TextLink } from "../../shared/components/Button";
import { PageHeader } from "../../shared/components/Layout";

export function NotFoundPage({ directoryPath }: { directoryPath: string }): ReactElement {
  return (
    <>
      <PageHeader title="Page not found" />
      <TextLink to={directoryPath}>Employee directory</TextLink>
    </>
  );
}
