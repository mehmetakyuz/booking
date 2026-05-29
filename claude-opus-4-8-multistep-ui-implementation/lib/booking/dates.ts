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
