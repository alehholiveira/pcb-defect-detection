import { describe, it, expect } from 'vitest';
import { formatDateTime, formatDateString } from '../../../utils/formatDate';
import { i18n } from '../../../i18n';

describe('formatDate Utils Unit Tests', () => {
  it('should format ISO string to localized date and time in pt-BR', () => {
    i18n.changeLanguage('pt-BR');
    const result = formatDateTime('2026-07-31T15:30:00.000Z');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should format YYYY-MM-DD string to DD/MM/YYYY in pt-BR', () => {
    i18n.changeLanguage('pt-BR');
    const result = formatDateString('2026-07-31');
    expect(result).toBe('31/07/2026');
  });

  it('should format YYYY-MM-DD string to MM/DD/YYYY in English', () => {
    i18n.changeLanguage('en');
    const result = formatDateString('2026-07-31');
    expect(result).toBe('07/31/2026');
  });

  it('should return empty string for falsy date input', () => {
    expect(formatDateString('')).toBe('');
  });
});
