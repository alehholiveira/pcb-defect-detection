/**
 * Format a Date object into a relative "time ago" string.
 * Uses native Intl.RelativeTimeFormat API for automatic locale support.
 * 
 * Threshold Logic:
 * - < 60 seconds: Returns "just now" (avoiding "0 seconds ago")
 * - < 60 minutes: Scales to minutes
 * - < 24 hours: Scales to hours
 * - >= 24 hours: Scales to days (we stop here as our data usually doesn't exceed a few days/weeks)
 */
export function formatTimeAgo(date: Date, locale: string, t: (key: string) => string): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return t('notifications.justNow');
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return rtf.format(-diffInMinutes, 'minute');
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return rtf.format(-diffInHours, 'hour');
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return rtf.format(-diffInDays, 'day');
}
