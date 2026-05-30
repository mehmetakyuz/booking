export function formatMoney(amountMinor: number, currencyCode: string = 'GBP'): string {
  const amountMajor = amountMinor / 100;
  
  const symbolMap: Record<string, string> = {
    GBP: '£',
    EUR: '€',
    USD: '$'
  };
  const symbol = symbolMap[currencyCode.toUpperCase()] || currencyCode || '£';
  
  const formatter = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: amountMajor % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formatter.format(amountMajor)}`;
}

export function parseISODuration(durationStr: string | null | undefined): string {
  if (!durationStr) return '';
  
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?/;
  const match = durationStr.match(regex);
  if (!match) return durationStr;
  
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'min' : 'mins'}`);
  
  return parts.join(' ');
}

export function getLeisureGroupTypeLabel(groupType: string | null | undefined): string {
  if (!groupType) return '';
  const map: Record<string, string> = {
    GROUP_TOUR: 'Group tour',
    INDIVIDUAL: 'Individual'
  };
  return map[groupType.toUpperCase()] || groupType;
}

export function getCarExtraTypeLabel(extraType: string | null | undefined): string {
  if (!extraType) return '';
  const map: Record<string, string> = {
    GPS: 'GPS Navigation',
    CHILD_SEAT: 'Child Safety Seat',
    ADDITIONAL_DRIVER: 'Additional Driver',
    WINTER_TYRES: 'Winter Tyres',
    INSURANCE: 'Excess Insurance'
  };
  return map[extraType.toUpperCase()] || extraType;
}
