import './ToggleSwitch.css';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  id,
}: ToggleSwitchProps) {
  return (
    <div className={`toggle-switch ${disabled ? 'toggle-switch--disabled' : ''}`}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`toggle-switch__track ${checked ? 'toggle-switch__track--checked' : ''}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-switch__thumb" />
      </button>
    </div>
  );
}
