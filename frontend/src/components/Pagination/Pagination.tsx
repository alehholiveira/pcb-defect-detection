import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (size: number) => void;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

/**
 * Calculates the array of page buttons to render, inserting 'ellipsis' 
 * where page gaps exist.
 * 
 * Algorithm:
 * - If total pages <= 7, display all pages without ellipsis.
 * - Otherwise, always show the first and last pages.
 * - Calculate a dynamic sliding window `[current - 1, current + 1]`.
 * - Insert 'ellipsis' if there's a gap between page 1 and the window start, 
 *   or between the window end and the last page.
 */
function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];

  if (current > 3) {
    pages.push('ellipsis');
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push('ellipsis');
  }

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  className = '',
}: PaginationProps) {
  const { t } = useTranslation();

  const pages = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  if (totalPages <= 0) return null;

  return (
    <div className={`pagination ${className}`}>
      {/* Left: Result count */}
      <span className="pagination__info">
        {t('pagination.showing')}{' '}
        <strong>{startItem}</strong>{' '}
        {t('pagination.to')}{' '}
        <strong>{endItem}</strong>{' '}
        {t('pagination.of')}{' '}
        <strong>{totalItems}</strong>{' '}
        {t('pagination.results')}
      </span>

      {/* Center: Page buttons */}
      <nav className="pagination__nav" aria-label={t('pagination.ariaLabel')}>
        <button
          type="button"
          className="pagination__btn pagination__btn--arrow"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label={t('pagination.previous')}
        >
          <ChevronLeft size={16} />
        </button>

        {pages.map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="pagination__ellipsis">
              &hellip;
            </span>
          ) : (
            <button
              key={page}
              type="button"
              className={`pagination__btn pagination__btn--page ${
                page === currentPage ? 'pagination__btn--active' : ''
              }`}
              onClick={() => onPageChange(page)}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </button>
          ),
        )}

        <button
          type="button"
          className="pagination__btn pagination__btn--arrow"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label={t('pagination.next')}
        >
          <ChevronRight size={16} />
        </button>
      </nav>

      {/* Right: Items per page */}
      {onItemsPerPageChange && (
        <div className="pagination__per-page">
          <label htmlFor="pagination-per-page" className="pagination__per-page-label">
            {t('pagination.rowsPerPage')}
          </label>
          <select
            id="pagination-per-page"
            className="pagination__per-page-select"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
