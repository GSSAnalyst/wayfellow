import type { Category } from "../lib/types";

type P = { size?: number; className?: string };
const svg = (size = 18, className?: string) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className, "aria-hidden": true });

export const IconTrip = ({ size, className }: P) => <svg {...svg(size, className)}><path d="m3 19 6-10 4 6 2-3 6 7z" /></svg>;
export const IconPlane = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M2 13l20-6-6 13-3-6z" /></svg>;
export const IconHome = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></svg>;
export const IconBag = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>;
export const IconMusic = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>;
export const IconLock = ({ size, className }: P) => <svg {...svg(size, className)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IconUnlock = ({ size, className }: P) => <svg {...svg(size, className)}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 7.5-2" /></svg>;
export const IconSearch = ({ size, className }: P) => <svg {...svg(size, className)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconMap = ({ size, className }: P) => <svg {...svg(size, className)}><path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></svg>;
export const IconList = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
export const IconPin = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export const IconSend = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>;
export const IconSpark = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>;
export const IconLeaf = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" /><path d="M5 19c3-4 6-6 10-8" /></svg>;
export const IconCalendar = ({ size, className }: P) => <svg {...svg(size, className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
export const IconBack = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M15 18l-6-6 6-6" /></svg>;
export const IconMail = ({ size, className }: P) => <svg {...svg(size, className)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
export const IconShield = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
export const IconChat = ({ size, className }: P) => <svg {...svg(size, className)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /></svg>;
export const IconStar = ({ size, className, filled }: P & { filled?: boolean }) => (
  <svg {...svg(size, className)} fill={filled ? "currentColor" : "none"}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" /></svg>
);

export function CategoryIcon({ category, size }: { category: Category; size?: number }) {
  const C = { trip: IconTrip, airport: IconPlane, home: IconHome, errand: IconBag, event: IconMusic }[category] ?? IconTrip;
  return <C size={size} />;
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="none" stroke="#4FD6E0" strokeWidth="2" />
      <path d="M7.5 10.5l3.2 11 5.3-8.5 5.3 8.5 3.2-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="9" r="2" fill="#FFB547" />
    </svg>
  );
}
