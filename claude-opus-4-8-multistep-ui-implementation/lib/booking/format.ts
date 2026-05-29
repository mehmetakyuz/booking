// Money formatting. ALL API price values are integers in the currency's minor
// unit (pence/cents). Divide by 100 at the render boundary ONLY — never mutate
// stored payload values, and keep all arithmetic in minor units.

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
};

const MINOR_UNIT_FACTOR: Record<string, number> = {
  GBP: 100,
  EUR: 100,
  USD: 100,
};

function symbolFor(currency = "GBP"): string {
  return CURRENCY_SYMBOL[currency] ?? currency + " ";
}

function factorFor(currency = "GBP"): number {
  return MINOR_UNIT_FACTOR[currency] ?? 100;
}

// Format a minor-unit integer to a display string, e.g. 156300 -> "£1,563".
export function formatMoney(
  minor: number | null | undefined,
  currency = "GBP",
  opts: { showDecimals?: boolean } = {},
): string {
  const value = (minor ?? 0) / factorFor(currency);
  const hasFraction = value % 1 !== 0;
  const showDecimals = opts.showDecimals ?? hasFraction;
  const body = value.toLocaleString("en-GB", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return `${symbolFor(currency)}${body}`;
}

// Signed delta against a baseline, e.g. +£0, +£80, -£40.
export function formatDelta(
  minorDelta: number,
  currency = "GBP",
): string {
  const sign = minorDelta > 0 ? "+" : minorDelta < 0 ? "-" : "+";
  return `${sign}${formatMoney(Math.abs(minorDelta), currency)}`;
}
