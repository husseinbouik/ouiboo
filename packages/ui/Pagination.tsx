import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from './utils';
import { Button } from './Button';

export interface PaginationState {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationLabels {
  showing?: string;
  of?: string;
  pagination?: string;
  previousPage?: string;
  nextPage?: string;
  goToPage?: (page: number) => string;
}

export interface PaginationProps {
  pagination: PaginationState | null | undefined;
  onPageChange: (page: number) => void;
  className?: string;
  pageRange?: number;
  labels?: PaginationLabels;
}

const buildPageItems = (
  currentPage: number,
  totalPages: number,
  pageRange: number,
): Array<number | 'ellipsis'> => {
  const items: Array<number | 'ellipsis'> = [];
  for (let p = 1; p <= totalPages; p++) {
    const keep =
      p === 1 ||
      p === totalPages ||
      Math.abs(p - currentPage) <= pageRange;
    if (keep) {
      items.push(p);
      continue;
    }
    if (items[items.length - 1] !== 'ellipsis') {
      items.push('ellipsis');
    }
  }
  return items;
};

export const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({ pagination, onPageChange, className, pageRange = 2, labels }, ref) => {
    if (!pagination || pagination.totalPages <= 1) {
      return null;
    }

    const showingLabel = labels?.showing ?? 'Showing';
    const ofLabel = labels?.of ?? 'of';
    const paginationLabel = labels?.pagination ?? 'Pagination';
    const previousPageLabel = labels?.previousPage ?? 'Previous page';
    const nextPageLabel = labels?.nextPage ?? 'Next page';
    const goToPageLabel = labels?.goToPage ?? ((page: number) => `Go to page ${page}`);
    const { page, totalPages, limit, total } = pagination;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const pageItems = buildPageItems(currentPage, totalPages, pageRange);
    const shownThrough = Math.min(currentPage * limit, total);

    return (
      <div
        ref={ref}
        className={cn('w-full flex flex-wrap items-center justify-between gap-3', className)}
      >
        <p className="text-xs text-muted-foreground">
          {showingLabel} <strong className="text-foreground">{shownThrough}</strong> {ofLabel}{' '}
          <strong className="text-foreground">{total}</strong>
        </p>
        <nav aria-label={paginationLabel} className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            aria-label={previousPageLabel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pageItems.map((item, index) => {
            const showGap = item === 'ellipsis';
            if (showGap) {
              return (
                <span key={`ellipsis-${index}`} className="px-1 text-muted-foreground" aria-hidden="true">
                  &hellip;
                </span>
              );
            }
            return (
              <Button
                key={item}
                variant={item === currentPage ? 'default' : 'secondary'}
                size="sm"
                onClick={() => onPageChange(item)}
                disabled={item === currentPage}
                aria-label={goToPageLabel(item)}
                aria-current={item === currentPage ? 'page' : undefined}
              >
                {item}
              </Button>
            );
          })}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            aria-label={nextPageLabel}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      </div>
    );
  },
);

Pagination.displayName = 'Pagination';