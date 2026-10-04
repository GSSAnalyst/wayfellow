import { useState } from "react";
import { DEFAULT_MILES, RADII } from "../lib/area";
import { useApp } from "../lib/app";
import { IconPin } from "./Icons";
import { PlacePicker, type PlaceValue } from "./PlacePicker";

const blank: PlaceValue = { label: "", lat: null, lng: null };

/** Where the student is and how far out to look. Drives the board and Smart match. */
export function AreaBar() {
  const { area, setArea } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlaceValue>(blank);

  const choose = (v: PlaceValue) => {
    setDraft(v);
    if (v.lat == null || v.lng == null || v.label === "Locating…") return;
    setArea({ label: v.label, lat: v.lat, lng: v.lng, miles: area?.miles ?? DEFAULT_MILES });
    setEditing(false);
    setDraft(blank);
  };

  return (
    <div className="area-bar">
      <div className="area-row">
        <IconPin size={18} className="area-pin" />
        {area ? (
          <>
            <span>Rides leaving near <b>{area.label}</b></span>
            <select aria-label="How far" value={area.miles} onChange={e => setArea({ ...area, miles: +e.target.value })}>
              {RADII.map(m => <option key={m} value={m}>{m ? `within ${m} mi` : "anywhere in the US"}</option>)}
            </select>
          </>
        ) : (
          <span>Showing rides from every school. <b>Set your area</b> to see what's leaving near you.</span>
        )}
        <button type="button" className="text-btn inline" onClick={() => setEditing(e => !e)} aria-expanded={editing}>
          {editing ? "Cancel" : area ? "Change" : "Set my area"}
        </button>
      </div>
      {editing && (
        <div className="area-edit">
          <PlacePicker label="Your area" value={draft} onChange={choose} placeholder="Campus, city, or zip code" />
        </div>
      )}
    </div>
  );
}
