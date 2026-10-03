import type { LatLng } from "./types";
import { CONFIG } from "./config";

export interface Place { label: string; short: string; lat: number; lng: number }

/** Search places with OpenStreetMap Nominatim, biased toward the campus area. Public server: keep usage light. */
export async function searchPlaces(q: string, signal?: AbortSignal): Promise<Place[]> {
  const [lat, lng] = CONFIG.campusCenter;
  const box = [lng - 1.5, lat + 1.2, lng + 1.5, lat - 1.2].join(",");
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=us&viewbox=${box}&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal, headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("search failed");
  const rows = (await res.json()) as { display_name: string; name?: string; lat: string; lon: string }[];
  return rows.map(r => ({
    label: r.display_name,
    short: r.name || r.display_name.split(",").slice(0, 2).join(","),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));
}

export async function reversePlace(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
    const j = await res.json();
    return (j.name || (j.display_name || "").split(",").slice(0, 2).join(",") || "Dropped pin").slice(0, 80);
  } catch { return "Dropped pin"; }
}

/** Straight-line distance in miles. */
export function haversineMiles(a: LatLng, b: LatLng) {
  const R = 3958.8, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Driving route from the public OSRM demo server. Falls back to a straight line. */
export async function drivingRoute(a: LatLng, b: LatLng): Promise<{ miles: number; path: LatLng[]; estimated: boolean }> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a[1]},${a[0]};${b[1]},${b[0]}?overview=simplified&geometries=geojson`;
    const res = await fetch(url);
    const j = await res.json();
    const r = j.routes?.[0];
    if (!r) throw new Error("no route");
    const path: LatLng[] = r.geometry.coordinates.map(([x, y]: [number, number]) => [+y.toFixed(5), +x.toFixed(5)]);
    return { miles: Math.round(r.distance / 1609.34), path: thin(path, 300), estimated: false };
  } catch {
    return { miles: Math.round(haversineMiles(a, b) * 1.25), path: [a, b], estimated: true };
  }
}

function thin(path: LatLng[], max: number) {
  if (path.length <= max) return path;
  const step = path.length / max;
  const out: LatLng[] = [];
  for (let i = 0; i < max; i++) out.push(path[Math.floor(i * step)]);
  out.push(path[path.length - 1]);
  return out;
}
