import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useApp } from "../lib/app";
import { US_CENTER, US_ZOOM } from "../lib/config";
import type { LatLng } from "../lib/types";

export interface MapRoute {
  id: string;
  from: LatLng;
  to: LatLng;
  path?: LatLng[] | null;
  kind?: "offer" | "want";
  label?: string;
  highlight?: boolean;
}

const pin = (cls: string, text?: string) =>
  L.divIcon({ className: "map-pin-wrap", html: `<span class="map-pin ${cls}">${text ?? ""}</span>`, iconSize: [22, 22], iconAnchor: [11, 11] });

/**
 * Map with one or many routes. Clicking a route calls onSelect.
 * When `onPick` is set, clicking the map drops a point instead.
 */
export function RideMap({ routes, height = 360, onSelect, onPick, picked, className }: {
  routes: MapRoute[];
  height?: number | string;
  onSelect?: (id: string) => void;
  onPick?: (p: LatLng) => void;
  picked?: LatLng | null;
  className?: string;
}) {
  const { area } = useApp();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView(area ? [area.lat, area.lng] : US_CENTER, area ? 10 : US_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on("click", e => pickRef.current?.([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)]));
    m.on("focus", () => m.scrollWheelZoom.enable());
    m.on("blur", () => m.scrollWheelZoom.disable());
    m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(box.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; };
    // Start view only; routes and pins move the map after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    for (const r of routes) {
      const path = r.path && r.path.length > 1 ? r.path : [r.from, r.to];
      const cls = r.kind === "want" ? "want" : "offer";
      const glow = L.polyline(path, { className: `route-glow ${cls}${r.highlight ? " hl" : ""}`, weight: r.highlight ? 12 : 9, interactive: false });
      const line = L.polyline(path, { className: `route-line ${cls}${r.highlight ? " hl" : ""}`, weight: r.highlight ? 4.5 : 3.5, dashArray: r.path && r.path.length > 2 ? undefined : "6 8", interactive: !!onSelect || !!r.label });
      if (onSelect) line.on("click", () => onSelect(r.id));
      if (r.label) line.bindTooltip(r.label, { sticky: true, className: "map-tip" });
      glow.addTo(g); line.addTo(g);
      const a = L.marker(r.from, { icon: pin("a " + cls), keyboard: false }).addTo(g);
      const b = L.marker(r.to, { icon: pin("b " + cls), keyboard: false }).addTo(g);
      if (onSelect) { a.on("click", () => onSelect(r.id)); b.on("click", () => onSelect(r.id)); }
      if (r.label) { a.bindTooltip(r.label, { className: "map-tip" }); b.bindTooltip(r.label, { className: "map-tip" }); }
      bounds.push(...path);
    }
    if (picked) { L.marker(picked, { icon: pin("pick") }).addTo(g); bounds.push(picked); }
    if (bounds.length > 1) m.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 14 });
    else if (bounds.length === 1) m.setView(bounds[0], 14);
  }, [routes, picked, onSelect]);

  return <div ref={box} className={"ride-map " + (className ?? "")} style={{ height }} role="region" aria-label="Map" />;
}
