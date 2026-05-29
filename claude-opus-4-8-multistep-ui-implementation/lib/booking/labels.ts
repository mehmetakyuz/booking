// Deliberate, user-facing label maps for enum-like backend values.
// Never lowercase/replace-underscore/title-case raw enums for display.

const TOUR_TYPE_LABELS: Record<string, string> = {
  GROUP_TOUR: "Group tour",
  INDIVIDUAL: "Private",
  PRIVATE_TOUR: "Private tour",
  SELF_GUIDED: "Self-guided",
};

export function tourTypeLabel(value?: string | null): string | null {
  if (!value) return null;
  return TOUR_TYPE_LABELS[value] ?? null;
}

const CABIN_CLASS_LABELS: Record<string, string> = {
  ECONOMY: "Economy",
  PREMIUM_ECONOMY: "Premium economy",
  BUSINESS: "Business",
  FIRST: "First class",
};

export function cabinClassLabel(value?: string | null): string | null {
  if (!value) return null;
  return CABIN_CLASS_LABELS[value] ?? null;
}

const TRANSMISSION_LABELS: Record<string, string> = {
  AUTOMATIC: "Automatic",
  MANUAL: "Manual",
};

export function transmissionLabel(value?: string | null): string | null {
  if (!value) return null;
  return TRANSMISSION_LABELS[value] ?? null;
}

const CAR_EXTRA_TYPE_LABELS: Record<string, string> = {
  INSURANCE: "Insurance",
  EQUIPMENT: "Equipment",
  SERVICE: "Service",
  PROTECTION: "Protection",
};

export function carExtraTypeLabel(value?: string | null): string | null {
  if (!value) return null;
  return CAR_EXTRA_TYPE_LABELS[value] ?? null;
}

// Parse an ISO-8601 duration (PT2H, PT6H30M, PT45M) into "2 hours 30 mins".
export function formatDuration(iso?: string | null): string | null {
  if (!iso) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return null;
  const hours = m[1] ? parseInt(m[1], 10) : 0;
  const mins = m[2] ? parseInt(m[2], 10) : 0;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  if (mins > 0) parts.push(`${mins} ${mins === 1 ? "min" : "mins"}`);
  if (parts.length === 0) return null;
  return parts.join(" ");
}

// Compute a human-readable duration between two ISO datetimes, e.g. "2h 30m".
// Used for per-segment flight time and connection/layover windows where the
// backend does not provide an explicit duration field.
export function durationBetween(
  start?: string | null,
  end?: string | null,
): string | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return null;
  const totalMins = Math.round((b - a) / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours === 0) parts.push(`${mins}m`);
  return parts.join(" ");
}

export function carExtraPayment(prePayable?: boolean): string {
  return prePayable ? "Pay now" : "Pay at desk";
}
