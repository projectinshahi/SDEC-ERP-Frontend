/**
 * Utility functions for the application
 */

/**
 * Combine class names conditionally
 */
export function classNames(
  ...classes: (string | undefined | null | false)[]
): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'compact' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  if (format === 'compact') {
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  const options: Record<'short' | 'long', Intl.DateTimeFormatOptions> = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  };

  return dateObj.toLocaleDateString('en-US', options[format]);
}

/**
 * Format a 24-hour time string ("HH:MM" or "HH:MM:SS") into a readable 12-hour
 * AM/PM label. Display-only — never mutates the stored value.
 *
 * Examples:
 *   "14:00" -> "02:00 PM"
 *   "15:30" -> "03:30 PM"
 *   "09:15" -> "09:15 AM"
 *   "00:00" -> "12:00 AM"
 *   "12:00" -> "12:00 PM"
 *   "23:59" -> "11:59 PM"
 *
 * Unrecognized input is returned unchanged so callers never render "Invalid".
 */
export function formatTime(time?: string | null): string {
  if (!time) return '';
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(time);

  const hours24 = parseInt(match[1], 10);
  const minutes = match[2];
  if (isNaN(hours24) || hours24 > 23 || parseInt(minutes, 10) > 59) return String(time);

  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`;
}

/**
 * Acronyms that should stay fully uppercase in human-readable status labels.
 */
const STATUS_ACRONYMS = new Set([
  'qa', 'qc', 'ui', 'ux', 'api', 'id', 'url', 'db', 'io', 'sdk', 'crm', 'erp', 'hr', 'ai', 'ml',
]);

/**
 * Convert a status key into a human-readable label.
 *
 * Handles snake_case, kebab-case and camelCase, preserves common acronyms, and
 * is idempotent for already-readable labels.
 *
 * Examples:
 *   "in_progress" -> "In Progress"
 *   "qa_testing"  -> "QA Testing"
 *   "inReview"    -> "In Review"
 *   "OPEN"        -> "Open"
 *   "In Progress" -> "In Progress"
 */
export function formatStatusLabel(status?: string | null): string {
  if (status === null || status === undefined) return '';
  const text = String(status).trim();
  if (!text) return '';

  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase: inProgress -> in Progress
    .replace(/[_-]+/g, ' ') // snake_case / kebab-case -> spaces
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      STATUS_ACRONYMS.has(word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

/**
 * Delay execution (useful for debouncing/throttling)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unexpected error occurred';
}

/**
 * Truncate string to specified length
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Check if URL is absolute
 */
export function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
