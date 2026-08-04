import { i18n } from '../i18n';

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const lang = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
  return date.toLocaleDateString(lang, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateOnly(iso: string): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return formatDateString(iso);
  }
  const date = new Date(iso);
  const lang = i18n.language.startsWith('pt') ? 'pt-BR' : 'en-US';
  return date.toLocaleDateString(lang);
}

export function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    return i18n.language.startsWith('pt') ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
  }
  return dateStr;
}
