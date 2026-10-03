import type { Category, Ride } from "./types";

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: "trip", label: "Weekend trip" },
  { id: "airport", label: "Airport run" },
  { id: "home", label: "Home for break" },
  { id: "errand", label: "Errand run" },
  { id: "event", label: "Concert or event" },
];
export const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label])) as Record<Category, string>;

export const num = (v: unknown) => { const n = typeof v === "number" ? v : parseFloat(String(v)); return Number.isFinite(n) ? n : 0; };

export function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return "$" + (n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(2).replace(/\.00$/, ""));
}

/** Gas cost per person when the car is full (driver included). */
export function perSeat(r: Pick<Ride, "kind" | "miles" | "mpg" | "gas_price" | "seats">) {
  if (r.kind !== "offer" || !num(r.miles) || !num(r.mpg)) return null;
  return (num(r.miles) / num(r.mpg)) * num(r.gas_price) / (num(r.seats) + 1);
}

export function whenText(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + ", " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function relText(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  const h = ms / 36e5;
  if (h < 0) {
    const ago = -h;
    if (ago < 24) return `${Math.max(1, Math.round(ago))} hr ago`;
    const d = Math.round(ago / 24);
    return `${d} ${d === 1 ? "day" : "days"} ago`;
  }
  if (h < 1) return `in ${Math.max(1, Math.round(ms / 6e4))} min`;
  if (h < 24) return `in ${Math.round(h)} hr`;
  const d = Math.round(h / 24);
  return `in ${d} ${d === 1 ? "day" : "days"}`;
}

export const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

export function localDateInput(d = new Date()) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}

export function hue(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }

/** Rough CO2 saved: each extra rider is one solo car trip avoided (~0.4 kg CO2 per mile, EPA average car). */
export const co2SavedKg = (miles: number, riders: number) => Math.round(miles * 0.404 * riders);
