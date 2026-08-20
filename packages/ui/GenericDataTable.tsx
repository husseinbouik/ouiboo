'use client'

import * as React from 'react'
import {
  type ColumnDef,
  type Row,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from 'lucide-react'
import { Button } from './Button'
import { EmptyState } from './EmptyState'
import { Input } from './Input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './Table'
import { cn } from './utils'

const escapeCsvCell = (value: unknown) => {
  const serialized =
    value == null
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value)
  return `"${serialized.replace(/"/g, '""')}"`
}

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function SelectionCheckbox({
  indeterminate,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  indeterminate?: boolean
}) {
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate)
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      className="h-4 w-4 rounded border-border accent-primary"
      {...props}
    />
  )
}

export interface GenericDataTableLabels {
  searchPlaceholder?: string
  exportCsv?: string
  emptyTitle?: string
  emptyDescription?: string
  selected?: string
  rowsPerPage?: string
  page?: string
  previousPage?: string
  nextPage?: string
}

export interface GenericDataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  getRowId?: (row: TData, index: number) => string
  enableSelection?: boolean
  enableGlobalSearch?: boolean
  enableCsvExport?: boolean
  initialPageSize?: number
  pageSizeOptions?: number[]
  csvFilename?: string
  labels?: GenericDataTableLabels
  mobileCard?: (row: Row<TData>) => React.ReactNode
  toolbar?: React.ReactNode
  className?: string
  onSelectionChange?: (rows: TData[]) => void
}

export function GenericDataTable<TData>({
  data,
  columns,
  getRowId,
  enableSelection = false,
  enableGlobalSearch = true,
  enableCsvExport = true,
  initialPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  csvFilename = 'export',
  labels = {},
  mobileCard,
  toolbar,
  className,
  onSelectionChange,
}: GenericDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown>>(
    () => ({
      id: '__selection',
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <SelectionCheckbox
          checked={table.getIsAllPageRowsSelected()}
          indeterminate={table.getIsSomePageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        <SelectionCheckbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
    }),
    []
  )

  const resolvedColumns = React.useMemo(
    () => (enableSelection ? [selectionColumn, ...columns] : columns),
    [columns, enableSelection, selectionColumn]
  )

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    getRowId,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: initialPageSize } },
    enableRowSelection: enableSelection,
  })

  React.useEffect(() => {
    onSelectionChange?.(
      table.getSelectedRowModel().flatRows.map((row) => row.original)
    )
  }, [onSelectionChange, rowSelection, table])

  const exportRows = () => {
    const exportColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== '__selection')
    const header = exportColumns.map((column) =>
      escapeCsvCell(
        typeof column.columnDef.header === 'string'
          ? column.columnDef.header
          : column.id
      )
    )
    const body = table.getFilteredRowModel().rows.map((row) =>
      exportColumns
        .map((column) => escapeCsvCell(row.getValue(column.id)))
        .join(',')
    )
    downloadCsv(csvFilename, [header.join(','), ...body].join('\r\n'))
  }

  const selectedCount = table.getSelectedRowModel().flatRows.length
  const rowCount = table.getFilteredRowModel().rows.length

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          {enableGlobalSearch ? (
            <label className="relative block w-full max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="sr-only">
                {labels.searchPlaceholder || 'Search'}
              </span>
              <Input
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder={labels.searchPlaceholder || 'Search all columns…'}
                className="pl-9"
              />
            </label>
          ) : null}
          {enableSelection && selectedCount > 0 ? (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {selectedCount} {labels.selected || 'selected'}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          {enableCsvExport ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportRows}
              disabled={rowCount === 0}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {labels.exportCsv || 'Export CSV'}
            </Button>
          ) : null}
        </div>
      </div>

      {rowCount === 0 ? (
        <EmptyState
          title={labels.emptyTitle || 'No results'}
          description={
            labels.emptyDescription ||
            'Try changing your search or filter criteria.'
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const sorted = header.column.getIsSorted()
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1.5"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5" />
                              ) : (
                                <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                              )}
                            </button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {table.getRowModel().rows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
                data-state={row.getIsSelected() ? 'selected' : undefined}
              >
                {mobileCard ? (
                  mobileCard(row)
                ) : (
                  <dl className="grid gap-3">
                    {row
                      .getVisibleCells()
                      .filter((cell) => cell.column.id !== '__selection')
                      .map((cell) => (
                        <div
                          key={cell.id}
                          className="flex items-start justify-between gap-4"
                        >
                          <dt className="text-xs font-semibold uppercase text-muted-foreground">
                            {typeof cell.column.columnDef.header === 'string'
                              ? cell.column.columnDef.header
                              : cell.column.id}
                          </dt>
                          <dd className="text-right text-sm text-foreground">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </article>
            ))}
          </div>
        </>
      )}

      {rowCount > 0 ? (
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-2 text-muted-foreground">
            {labels.rowsPerPage || 'Rows per page'}
            <select
              value={table.getState().pagination.pageSize}
              onChange={(event) => table.setPageSize(Number(event.target.value))}
              className="h-9 rounded-md border border-border bg-background px-2 text-foreground"
            >
              {pageSizeOptions.map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-muted-foreground">
              {labels.page || 'Page'}{' '}
              <strong className="text-foreground">
                {table.getState().pagination.pageIndex + 1}
              </strong>{' '}
              / {table.getPageCount()}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label={labels.previousPage || 'Previous page'}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label={labels.nextPage || 'Next page'}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
