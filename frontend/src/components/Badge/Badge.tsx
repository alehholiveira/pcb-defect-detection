import { type ReactNode } from 'react';
import './Badge.css';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}: BadgeProps) {
  return (
    <span className={`badge badge--${variant} ${className}`}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}
