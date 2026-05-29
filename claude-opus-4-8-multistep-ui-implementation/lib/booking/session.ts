// Unique per-booking-session id, reused across every API call and persisted
// through encoded URL state so refresh restore continues the same session.

export function createSessionId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `se-${rand}`;
}
