import { type InputHTMLAttributes, type ReactNode } from 'react';
import './Input.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  icon?: ReactNode;
  onChange?: (value: string) => void;
}

export function Input({
  label,
  icon,
  className = '',
  disabled,
  onChange,
  ...rest
}: InputProps) {
  return (
    <div className={`input-field ${className}`}>
      {label && <label className="input-field__label">{label}</label>}
      <div className={`input-field__wrapper ${disabled ? 'input-field__wrapper--disabled' : ''}`}>
        {icon && <span className="input-field__icon" aria-hidden="true">{icon}</span>}
        <input
          className={`input-field__input ${icon ? 'input-field__input--with-icon' : ''}`}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        />
      </div>
    </div>
  );
}
