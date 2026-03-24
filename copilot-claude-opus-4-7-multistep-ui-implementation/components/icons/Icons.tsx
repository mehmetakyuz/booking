import type { FC, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: SVGProps<SVGSVGElement> = {
  width: "1em",
  height: "1em",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconFlight: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M21 16l-9-2V5.5a1.5 1.5 0 0 0-3 0V14l-9 2v2l9-1v4.5l-2.5 1V23L12 22l3.5.5V22L13 21v-4.5l9 1v-2z" /></svg>
);
export const IconHotel: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M3 21V7l9-4 9 4v14" /><path d="M7 11h2M11 11h2M15 11h2M7 15h2M11 15h2M15 15h2" /></svg>
);
export const IconCar: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5H3v-5z" /><circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" /><path d="M3 13h18" /></svg>
);
export const IconActivity: FC<IconProps> = p => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconCalendar: FC<IconProps> = p => (
  <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
);
export const IconPeople: FC<IconProps> = p => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15 15c3 0 6 2 6 5" /></svg>
);
export const IconCheck: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M5 12l5 5L20 7" /></svg>
);
export const IconClose: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IconChevronLeft: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
export const IconChevronRight: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconArrowRight: FC<IconProps> = p => (
  <svg {...base} {...p}><path d="M4 12h16M14 6l6 6-6 6" /></svg>
);
export const IconInfo: FC<IconProps> = p => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v5h1" /></svg>
);

// Facility icons mapped from backend tokens
const FACILITY_PATHS: Record<string, JSX.Element> = {
  wifi: <><path d="M2 9a16 16 0 0 1 20 0" /><path d="M5 12.5a11 11 0 0 1 14 0" /><path d="M8 16a6 6 0 0 1 8 0" /><circle cx="12" cy="19" r="1.2" /></>,
  restaurant: <><path d="M7 3v8a2 2 0 0 0 2 2v8" /><path d="M5 3v6M9 3v6" /><path d="M16 3c-2 0-3 2-3 5s1 5 3 5v8" /></>,
  lift: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 9l3-3 3 3M9 15l3 3 3-3" /></>,
  "front-desk": <><path d="M3 14h18v4H3z" /><path d="M5 14v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" /><circle cx="12" cy="10" r="1.2" /></>,
  "private-bathroom": <><path d="M3 14h18" /><path d="M5 14V6a3 3 0 0 1 6 0" /><path d="M4 14l1 6M20 14l-1 6" /></>,
  "tea-facilities": <><path d="M5 8h12v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8z" /><path d="M17 10h2a2 2 0 0 1 0 4h-2" /><path d="M9 4c0 1 1 1 1 2s-1 1-1 2M13 4c0 1 1 1 1 2s-1 1-1 2" /></>,
  "coffee-machine": <><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 8h8M9 12h6" /><circle cx="12" cy="16" r="1.5" /></>,
  parking: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M10 18V8h3a3 3 0 1 1 0 6h-3" /></>,
  spa: <><path d="M12 3c-3 4-3 8 0 12 3-4 3-8 0-12z" /><path d="M5 14c2 0 4 2 7 4M19 14c-2 0-4 2-7 4" /></>,
  "smoking-no": <><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /><path d="M3 14h14v4H3z" /></>,
  default: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></>,
};

export const FacilityIcon: FC<IconProps & { token?: string | null }> = ({ token, ...p }) => {
  const key = (token || "default").toLowerCase();
  const node = FACILITY_PATHS[key] || FACILITY_PATHS.default;
  return <svg {...base} {...p}>{node}</svg>;
};

export function itineraryIconFor(kind: string): FC<IconProps> {
  switch (kind) {
    case "flight": return IconFlight;
    case "accommodation": return IconHotel;
    case "car": return IconCar;
    case "activity": return IconActivity;
    default: return IconCalendar;
  }
}
