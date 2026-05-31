import { useId } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './DateRangePicker.css';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  label?: string;
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  label,
}: DateRangePickerProps) {
  const { t } = useTranslation();
  const id = useId();
  const startId = `${id}-start`;
  const endId = `${id}-end`;

  return (
    <div className="date-range-picker">
      {label && (
        <span className="date-range-picker__label">{label}</span>
      )}
      <div className="date-range-picker__row">
        <Calendar
          size={18}
          className="date-range-picker__icon"
          aria-hidden="true"
        />
        <div className="date-range-picker__field">
          <label htmlFor={startId} className="sr-only">
            {t('dateRangePicker.startDate', 'Start date')}
          </label>
          <input
            id={startId}
            type="date"
            className="date-range-picker__input"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </div>
        <span className="date-range-picker__separator" aria-hidden="true">
          —
        </span>
        <div className="date-range-picker__field">
          <label htmlFor={endId} className="sr-only">
            {t('dateRangePicker.endDate', 'End date')}
          </label>
          <input
            id={endId}
            type="date"
            className="date-range-picker__input"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onEndDateChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
