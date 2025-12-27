/**
 * Shared date formatting utilities.
 */

/**
 * Format a date string or Date object to a localized date string.
 * @param date - ISO date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString(undefined, options);
}

/**
 * Format a date string or Date object to a localized date and time string.
 */
export function formatDateTime(
  date: string | Date,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleString(undefined, options);
}

/**
 * Format a date range as "start → end".
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  if (!startDate && !endDate) return "—";
  if (!startDate) return `? → ${formatDate(endDate!)}`;
  if (!endDate) return `${formatDate(startDate)} → ?`;
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

/**
 * Format a date to YYYY-MM-DD format (for form inputs).
 */
export function formatDateInput(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toISOString().split("T")[0];
}

/**
 * Get a date N days ago from today.
 */
export function getDateDaysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Format a date range for quick date filters (Today, Last 7 Days, etc.).
 */
export function getQuickDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = getDateDaysAgo(days);
  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate),
  };
}

