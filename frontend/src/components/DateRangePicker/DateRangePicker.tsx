import { useState, useEffect, useId } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';
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
  const { t, i18n } = useTranslation();
  const id = useId();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);

  // Synchronize internal state with props
  useEffect(() => {
    const parsedStart = startDate ? parseISO(startDate) : null;
    const parsedEnd = endDate ? parseISO(endDate) : null;
    setDateRange([parsedStart, parsedEnd]);
  }, [startDate, endDate]);

  const onChange = (update: [Date | null, Date | null]) => {
    setDateRange(update);
    const [start, end] = update;
    
    if (start) {
      onStartDateChange(startOfDay(start).toISOString());
    } else {
      onStartDateChange('');
    }
    
    if (end) {
      onEndDateChange(endOfDay(end).toISOString());
    } else {
      onEndDateChange('');
    }
  };

  return (
    <div className="date-range-picker">
      {label && (
        <label htmlFor={id} className="date-range-picker__label">
          {label}
        </label>
      )}
      <div className="date-range-picker__wrapper">
        <Calendar
          size={18}
          className="date-range-picker__icon"
          aria-hidden="true"
        />
        <DatePicker
          id={id}
          selectsRange={true}
          startDate={dateRange[0]}
          endDate={dateRange[1]}
          onChange={onChange}
          isClearable={true}
          placeholderText={t('dateRangePicker.placeholder', 'Selecione o período...')}
          className="date-range-picker__input"
          dateFormat={i18n.language.startsWith('pt') ? 'dd/MM/yyyy' : 'MM/dd/yyyy'}
        />
      </div>
    </div>
  );
}
