import type { LatLng } from "./types";

/** Where a student is based. The board shows rides leaving within `miles` of it; 0 means anywhere. */
export interface Area { label: string; lat: number; lng: number; miles: number }

export const RADII = [10, 25, 50, 100, 250, 0];
export const DEFAULT_MILES = 50;
const KEY = "wayfellow-area";

export function loadArea(): Area | null {
  try {
    const a = JSON.parse(localStorage.getItem(KEY) || "null");
    return a && typeof a.lat === "number" && typeof a.lng === "number" ? a : null;
  } catch { return null; }
}

export function saveArea(a: Area | null) {
  try { if (a) localStorage.setItem(KEY, JSON.stringify(a)); else localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

/** The area as a board filter, or undefined for "anywhere". */
export const nearOf = (a: Area | null) => (a && a.miles > 0 ? { center: [a.lat, a.lng] as LatLng, miles: a.miles } : undefined);
