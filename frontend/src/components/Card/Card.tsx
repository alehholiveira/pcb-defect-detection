import { type ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function Card({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  noPadding = false,
}: CardProps) {
  const hasHeader = title || subtitle || headerAction;

  return (
    <div className={`card ${className}`}>
      {hasHeader && (
        <div className="card__header">
          <div className="card__header-text">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {headerAction && (
            <div className="card__header-action">{headerAction}</div>
          )}
        </div>
      )}
      <div className={`card__body ${noPadding ? 'card__body--no-padding' : ''}`}>
        {children}
      </div>
    </div>
  );
}
