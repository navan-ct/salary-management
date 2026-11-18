import { ChevronLeft, ChevronRight } from "lucide-react";
import { type Key, type ReactElement, type ReactNode } from "react";

import { Button } from "./Button";

export interface TableColumn<Row> {
  id: string;
  header: string;
  render: (row: Row) => ReactNode;
  numeric?: boolean;
  rowHeader?: boolean;
}

interface DataTableProps<Row> {
  caption: string;
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => Key;
}

export function DataTable<Row>({ caption, columns, rows, getRowKey }: DataTableProps<Row>): ReactElement {
  return (
    <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto rounded-panel border border-line bg-surface focus-ring">
      <table className="w-full min-w-table border-collapse text-body">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-subtle text-muted">
          <tr>
            {columns.map(({ id, header, numeric }) => (
              <th key={id} scope="col" className={`px-lg py-md font-semibold ${numeric ? "text-end" : "text-start"}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="hover:bg-canvas">
              {columns.map(({ id, render, numeric, rowHeader }) => {
                const Cell = rowHeader ? "th" : "td";

                return (
                  <Cell key={id} scope={rowHeader ? "row" : undefined} className={`border-t border-line px-lg py-md align-top ${numeric ? "text-end whitespace-nowrap tabular-nums" : "text-start"}`}>
                    {render(row)}
                  </Cell>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pending?: boolean;
  summary?: string;
}

export function Pagination({ page, pageCount, onPageChange, pending, summary }: PaginationProps): ReactElement | null {
  if (pageCount === 0) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-md">
      <p role="status" className="text-muted tabular-nums">{summary ?? `Page ${String(page)} of ${String(pageCount)}`}</p>
      <div className="flex flex-wrap items-center gap-sm">
        {summary && <span className="text-caption text-muted tabular-nums">Page {page} of {pageCount}</span>}
        <Button variant="secondary" onClick={() => {
          onPageChange(page - 1);
        }} disabled={pending === true || page <= 1} focusableWhenDisabled>
          <ChevronLeft aria-hidden="true" className="size-icon shrink-0" />
          Previous
        </Button>
        <Button variant="secondary" onClick={() => {
          onPageChange(page + 1);
        }} disabled={pending === true || page >= pageCount} focusableWhenDisabled>
          Next
          <ChevronRight aria-hidden="true" className="size-icon shrink-0" />
        </Button>
      </div>
    </nav>
  );
}
