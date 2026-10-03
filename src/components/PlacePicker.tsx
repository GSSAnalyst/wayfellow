import { useEffect, useId, useRef, useState } from "react";
import { CONFIG } from "../lib/config";
import { reversePlace, searchPlaces, type Place } from "../lib/geo";
import type { LatLng } from "../lib/types";
import { IconMap, IconPin } from "./Icons";
import { RideMap } from "./RideMap";

export interface PlaceValue { label: string; lat: number | null; lng: number | null }

/** Type to search places, or drop a pin on the map. */
export function PlacePicker({ label, value, onChange, placeholder, required }: {
  label: string;
  value: PlaceValue;
  onChange: (v: PlaceValue) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return;
    const q = value.label.trim();
    if (q.length < 3) { setResults([]); return; }
    const ctl = new AbortController();
    const t = window.setTimeout(async () => {
      setBusy(true);
      try { setResults(await searchPlaces(q, ctl.signal)); setOpen(true); setActive(-1); }
      catch { /* offline or rate limited: free text still works */ }
      finally { setBusy(false); }
    }, 450);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [value.label]);

  const choose = (p: Place) => { typed.current = false; onChange({ label: p.short.slice(0, 80), lat: p.lat, lng: p.lng }); setOpen(false); };
  const pick = async (p: LatLng) => {
    typed.current = false;
    onChange({ label: "Locating…", lat: p[0], lng: p[1] });
    onChange({ label: await reversePlace(p[0], p[1]), lat: p[0], lng: p[1] });
  };

  return (
    <div className="field place">
      <label htmlFor={id}>{label}</label>
      <div className="place-row">
        <div className="place-input">
          <IconPin size={17} className={value.lat != null ? "located" : ""} />
          <input
            id={id}
            value={value.label}
            required={required}
            maxLength={80}
            autoComplete="off"
            placeholder={placeholder}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={id + "-list"}
            onChange={e => { typed.current = true; onChange({ label: e.target.value, lat: null, lng: null }); }}
            onFocus={() => results.length && setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => {
              if (!open || !results.length) return;
              if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
              if (e.key === "Enter" && active >= 0) { e.preventDefault(); choose(results[active]); }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          {busy && <span className="spinner" aria-hidden="true" />}
        </div>
        <button type="button" className={"btn btn-line btn-icon" + (showMap ? " on" : "")} onClick={() => setShowMap(s => !s)} aria-pressed={showMap} title="Pick on map">
          <IconMap size={18} /><span className="sr">Pick on map</span>
        </button>
      </div>
      <div className="place-quick">
        <button type="button" className="chip chip-sm" onClick={() => { typed.current = false; onChange({ label: `${CONFIG.campusName} campus`, lat: CONFIG.campusCenter[0], lng: CONFIG.campusCenter[1] }); }}>{CONFIG.campusName} campus</button>
        {value.lat != null && <span className="located-note">Pinned on map</span>}
      </div>
      {open && results.length > 0 && (
        <ul className="place-list" id={id + "-list"} role="listbox">
          {results.map((r, i) => (
            <li key={r.label + i} role="option" aria-selected={i === active} className={i === active ? "active" : ""} onMouseDown={e => { e.preventDefault(); choose(r); }}>
              <b>{r.short}</b><small>{r.label}</small>
            </li>
          ))}
        </ul>
      )}
      {showMap && (
        <div className="place-map">
          <RideMap routes={[]} height={240} onPick={pick} picked={value.lat != null && value.lng != null ? [value.lat, value.lng] : null} />
          <span className="hint">Click the map to drop a pin.</span>
        </div>
      )}
    </div>
  );
}
