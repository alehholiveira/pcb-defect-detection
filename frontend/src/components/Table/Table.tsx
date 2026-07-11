import { type ReactNode, useState, useCallback } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './Table.css';

interface TableColumn<T = any> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => ReactNode;
}

interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  emptyMessage?: string;
  emptyDescription?: string;
  loading?: boolean;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onSort,
  sortField,
  sortOrder,
  emptyMessage,
  emptyDescription,
  loading = false,
  className = '',
}: TableProps<T>) {
  const { t } = useTranslation();
  const [internalSortField, setInternalSortField] = useState<string | null>(null);
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('asc');

  const activeSortField = sortField ?? internalSortField;
  const activeSortOrder = sortOrder ?? internalSortOrder;

  const handleSort = useCallback(
    (key: string) => {
      const newOrder =
        activeSortField === key && activeSortOrder === 'asc' ? 'desc' : 'asc';

      if (!sortField) {
        setInternalSortField(key);
        setInternalSortOrder(newOrder);
      }

      onSort?.(key, newOrder);
    },
    [activeSortField, activeSortOrder, sortField, onSort],
  );

  const renderSortIcon = (column: TableColumn) => {
    if (!column.sortable) return null;

    const isActive = activeSortField === column.key;
    const iconSize = 14;

    if (!isActive) {
      return <ArrowUpDown size={iconSize} className="table__sort-icon" />;
    }

    return activeSortOrder === 'asc' ? (
      <ArrowUp size={iconSize} className="table__sort-icon table__sort-icon--active" />
    ) : (
      <ArrowDown size={iconSize} className="table__sort-icon table__sort-icon--active" />
    );
  };

  const renderSkeletonRows = () =>
    Array.from({ length: 5 }).map((_, rowIdx) => (
      <tr key={`skeleton-${rowIdx}`} className="table__row table__row--skeleton">
        {columns.map((col) => (
          <td key={col.key} className="table__cell">
            <div className="table__skeleton-bar" />
          </td>
        ))}
      </tr>
    ));

  const renderEmptyState = () => (
    <tr className="table__row table__row--empty">
      <td colSpan={columns.length} className="table__cell table__empty-cell">
        <div className="table__empty">
          <p className="table__empty-message">
            {emptyMessage ?? t('table.emptyMessage')}
          </p>
          {emptyDescription && (
            <p className="table__empty-description">{emptyDescription}</p>
          )}
        </div>
      </td>
    </tr>
  );

  const renderRows = () =>
    data.map((row, rowIdx) => (
      <tr key={row.id ?? rowIdx} className="table__row">
        {columns.map((col) => (
          <td key={col.key} className="table__cell">
            {col.render ? col.render(row[col.key], row) : row[col.key]}
          </td>
        ))}
      </tr>
    ));

  return (
    <div className={`table-container ${className}`}>
      <table className="table">
        <thead className="table__head">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`table__header ${col.sortable ? 'table__header--sortable' : ''}`}
                style={col.width ? { width: col.width } : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                aria-sort={
                  activeSortField === col.key
                    ? activeSortOrder === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
              >
                <span className="table__header-content">
                  <span>{col.label}</span>
                  {renderSortIcon(col)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table__body">
          {loading
            ? renderSkeletonRows()
            : data.length === 0
              ? renderEmptyState()
              : renderRows()}
        </tbody>
      </table>
    </div>
  );
}
