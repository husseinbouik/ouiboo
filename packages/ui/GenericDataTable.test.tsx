import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import { GenericDataTable } from './GenericDataTable';

type Row = { id: string; name: string };

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name' },
];

const rows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i + 1), name: `Row ${i + 1}` }));

describe('GenericDataTable (#1029 server-pagination mode)', () => {
  it('client mode paginates in the browser', () => {
    render(
      <GenericDataTable
        data={rows(5)}
        columns={columns}
        enableGlobalSearch={false}
        enableCsvExport={false}
        initialPageSize={2}
      />
    );
    expect(screen.getAllByText('Row 1').length).toBeGreaterThan(0);
    expect(screen.queryByText('Row 3')).toBeNull();
    expect(document.body.textContent).toContain('1 / 3');
  });

  it('manual mode renders the parent page verbatim and reports page changes upward', () => {
    const onPaginationChange = jest.fn();
    const pagination: PaginationState = { pageIndex: 1, pageSize: 2 };
    render(
      <GenericDataTable
        data={rows(2)}
        columns={columns}
        enableGlobalSearch={false}
        enableCsvExport={false}
        manualPagination
        pageCount={5}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    );
    // The footer reflects the server page count, not the local row count.
    expect(document.body.textContent).toContain('2 / 5');
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPaginationChange).toHaveBeenCalled();
    const updater = onPaginationChange.mock.calls[0][0] as (
      old: PaginationState
    ) => PaginationState;
    expect(updater(pagination)).toEqual({ pageIndex: 2, pageSize: 2 });
  });

  it('manual mode shows the shared empty state when the page is empty', () => {
    render(
      <GenericDataTable
        data={[]}
        columns={columns}
        enableGlobalSearch={false}
        enableCsvExport={false}
        manualPagination
        pageCount={0}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        onPaginationChange={jest.fn()}
        labels={{ emptyTitle: 'Nothing here' }}
      />
    );
    expect(screen.getByText('Nothing here')).toBeTruthy();
  });
});
