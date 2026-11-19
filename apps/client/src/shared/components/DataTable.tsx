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
  pagination?: PaginationProps;
}

export function DataTable<Row>({ caption, columns, rows, getRowKey, pagination }: DataTableProps<Row>): ReactElement {
  return (
    <div className="table-panel">
      {pagination?.summary && <p className="px-lg py-md text-caption text-muted tabular-nums">{pagination.summary}</p>}
      <div role="region" aria-label={caption} tabIndex={0} className="overflow-x-auto table-focus">
        <table className="w-full min-w-table border-collapse text-body">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-subtle text-muted">
            <tr>
              {columns.map(({ id, header, numeric }) => (
                <th key={id} scope="col" className={`px-lg py-sm text-caption font-semibold whitespace-nowrap ${numeric ? "text-end" : "text-start"}`}>
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
                    <Cell key={id} scope={rowHeader ? "row" : undefined} className={`table-cell ${numeric ? "text-end whitespace-nowrap tabular-nums" : "text-start"}`}>
                      {render(row)}
                    </Cell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination page={pagination.page} pageCount={pagination.pageCount} onPageChange={pagination.onPageChange}
        pending={pagination.pending} summary={pagination.summary} />}
    </div>
  );
}

interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pending?: boolean | undefined;
  summary?: string | undefined;
}

export function Pagination({ page, pageCount, onPageChange, pending, summary }: PaginationProps): ReactElement | null {
  if (pageCount === 0) {
    return null;
  }

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-md border-t border-line px-lg py-md">
      {summary && <p role="status" className="sr-only">{summary}</p>}
      <p className="text-caption text-muted tabular-nums">Page {page} of {pageCount}</p>
      <div className="flex flex-wrap items-center gap-sm">
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
