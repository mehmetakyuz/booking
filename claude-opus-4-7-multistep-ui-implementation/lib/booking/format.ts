// Money: the API returns integer minor units (pence/cents). Divide by 100 only
// at the render boundary. All arithmetic stays in minor units.

const SYMBOLS: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency] ?? currency + " ";
}

export function formatMoney(
  minor: number | null | undefined,
  currency = "GBP",
): string {
  if (minor == null) return "";
  const sym = currencySymbol(currency);
  const major = minor / 100;
  const hasFraction = Math.round(minor) % 100 !== 0;
  const formatted = major.toLocaleString("en-GB", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}

// Signed delta relative to a baseline, e.g. "+£80", "-£40", "+£0".
export function formatDelta(
  minor: number | null | undefined,
  baseline: number | null | undefined,
  currency = "GBP",
): string {
  const a = minor ?? 0;
  const b = baseline ?? 0;
  const diff = a - b;
  const sign = diff < 0 ? "-" : "+";
  return `${sign}${formatMoney(Math.abs(diff), currency)}`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? "hour" : "hours"}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? "min" : "mins"}`);
  return parts.join(" ");
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseDate(iso: string): Date {
  // Treat as a plain date (no timezone shifting).
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function dateParts(iso: string | null | undefined) {
  if (!iso) return null;
  const d = parseDate(iso);
  return {
    day: d.getDate(),
    month: MONTHS_SHORT[d.getMonth()],
    year: d.getFullYear(),
    weekday: WEEKDAYS[d.getDay()],
  };
}

export function formatTime(datetime: string | null | undefined): string {
  if (!datetime) return "";
  const t = datetime.split("T")[1];
  if (!t) return "";
  return t.slice(0, 5);
}

export function formatDateTimeShort(datetime: string | null | undefined): string {
  if (!datetime) return "";
  const [datePart] = datetime.split("T");
  const p = dateParts(datePart);
  if (!p) return "";
  return `${p.day} ${p.month}, ${formatTime(datetime)}`;
}

export function minutesBetween(
  a: string | null | undefined,
  b: string | null | undefined,
): number | null {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((db - da) / 60000);
}
