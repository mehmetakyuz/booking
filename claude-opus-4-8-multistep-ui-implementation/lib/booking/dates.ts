// Timezone-safe date helpers. NEVER use toISOString() for calendar arithmetic —
// it converts to UTC and shifts the day for non-UTC timezones, which would make
// flexible checkout dates disagree between the calendar grid and the reprice
// logic.

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function prevYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return m === 1
    ? `${y - 1}-12`
    : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function nextYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, "0")}`;
}

// First and last dates of a given YYYY-MM.
export function monthDateRange(yearMonth: string): { dateFrom: string; dateTo: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    dateFrom: `${yearMonth}-01`,
    dateTo: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

// Decide which month to open the calendar on.
// - If there is an already-selected date, show its month.
// - Otherwise default to today's month unless globalMinDate is more than 30 days
//   away, in which case jump straight to globalMinDate's month.
export function pickInitialMonth(
  globalMinDate: string | null,
  selectedDate?: string,
): string {
  if (selectedDate) return selectedDate.slice(0, 7);
  const today = todayString();
  if (globalMinDate && globalMinDate > addDays(today, 30)) {
    return globalMinDate.slice(0, 7);
  }
  return today.slice(0, 7);
}
