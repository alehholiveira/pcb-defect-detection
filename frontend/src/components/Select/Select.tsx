import { type ReactNode, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder,
  icon,
  className = '',
  disabled,
  ...rest
}: SelectProps) {
  return (
    <div className={`select-field ${className}`}>
      {label && <label className="select-field__label">{label}</label>}
      <div className={`select-field__wrapper ${disabled ? 'select-field__wrapper--disabled' : ''}`}>
        {icon && <span className="select-field__icon" aria-hidden="true">{icon}</span>}
        <select
          className={`select-field__select ${icon ? 'select-field__select--with-icon' : ''}`}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="select-field__chevron" aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </div>
    </div>
  );
}
