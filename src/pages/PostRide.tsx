import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../lib/app";
import { CATEGORIES, localDateInput, money, num, perSeat } from "../lib/format";
import { drivingRoute } from "../lib/geo";
import type { Category, Kind, LatLng } from "../lib/types";
import { Empty } from "../components/Bits";
import { IconBack } from "../components/Icons";
import { PlacePicker, type PlaceValue } from "../components/PlacePicker";
import { RideMap } from "../components/RideMap";

const blank: PlaceValue = { label: "", lat: null, lng: null };

export function PostRide() {
  const { api, me, profile, ready, setSignInOpen, setProfileOpen, toast } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [kind, setKind] = useState<Kind>(params.get("kind") === "want" ? "want" : "offer");
  const [from, setFrom] = useState<PlaceValue>(blank);
  const [to, setTo] = useState<PlaceValue>(() => {
    const lat = params.get("lat"), lng = params.get("lng");
    return { label: params.get("to") ?? "", lat: lat ? +lat : null, lng: lng ? +lng : null };
  });
  const [date, setDate] = useState(params.get("date") || localDateInput());
  const [time, setTime] = useState("09:00");
  const [category, setCategory] = useState<Category>("trip");
  const [seats, setSeats] = useState(kind === "offer" ? 3 : 1);
  const [miles, setMiles] = useState("");
  const [milesAuto, setMilesAuto] = useState(false);
  const [mpg, setMpg] = useState("30");
  const [gas, setGas] = useState("4.90");
  const [pickup, setPickup] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [route, setRoute] = useState<LatLng[] | null>(null);
  const [routing, setRouting] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Work out the driving route and distance as soon as both ends are on the map.
  useEffect(() => {
    if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) { setRoute(null); return; }
    let alive = true;
    setRouting(true);
    drivingRoute([from.lat, from.lng], [to.lat, to.lng]).then(r => {
      if (!alive) return;
      setRoute(r.path);
      if (!miles || milesAuto) { setMiles(String(r.miles)); setMilesAuto(true); }
    }).finally(() => alive && setRouting(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from.lat, from.lng, to.lat, to.lng]);

  if (ready && api.mode === "live" && !me) {
    return <div className="wrap page"><Empty title="Sign in to post a ride" action={<button className="btn btn-primary" onClick={() => setSignInOpen(true)}>Sign in</button>}>Only signed-in campus students can post.</Empty></div>;
  }
  if (ready && me && !profile) {
    return <div className="wrap page"><Empty title="Set up your profile first" action={<button className="btn btn-primary" onClick={() => setProfileOpen(true)}>Set up profile</button>}>Riders and drivers see your name before saying yes.</Empty></div>;
  }

  const preview = perSeat({ kind: "offer", miles: num(miles), mpg: num(mpg), gas_price: num(gas), seats });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const depart = new Date(`${date}T${time || "09:00"}`);
    if (!from.label.trim() || !to.label.trim()) return setErr("Add where the trip starts and where it's headed.");
    if (Number.isNaN(depart.getTime())) return setErr("Pick a date and time.");
    if (depart.getTime() < Date.now() - 5 * 6e4) return setErr("That time has already passed. Pick a later one.");
    if (!contact.trim()) return setErr("Add a phone number or handle so approved people can reach you.");
    setBusy(true); setErr("");
    try {
      const id = await api.createRide({
        kind, category,
        origin: from.label.trim(), destination: to.label.trim(),
        origin_lat: from.lat, origin_lng: from.lng, dest_lat: to.lat, dest_lng: to.lng,
        route, pickup_note: pickup.trim() || null,
        depart_at: depart.toISOString(), seats,
        miles: num(miles) || null,
        mpg: kind === "offer" ? num(mpg) || null : null,
        gas_price: kind === "offer" ? num(gas) || null : null,
        note: note.trim() || null,
      }, contact.trim());
      toast(kind === "offer" ? "Ride posted" : "Request posted");
      nav(`/ride/${id}`);
    } catch (ex) {
      console.error(ex);
      setErr("Couldn't post that. Check the details and try again.");
    } finally { setBusy(false); }
  }

  const haveBoth = from.lat != null && to.lat != null;

  return (
    <div className="wrap page">
      <button className="back" onClick={() => nav(-1)}><IconBack size={18} /> Back</button>
      <div className="post-layout">
        <form className="panel form-grid" onSubmit={submit} noValidate>
          <h1 className="page-title full">{kind === "offer" ? "Post a ride" : "Ask for a ride"}</h1>
          <div className="seg full" role="group" aria-label="Ride type">
            <button type="button" aria-pressed={kind === "offer"} onClick={() => { setKind("offer"); setSeats(3); }}>I'm driving</button>
            <button type="button" aria-pressed={kind === "want"} onClick={() => { setKind("want"); setSeats(1); }}>I need a ride</button>
          </div>
          <div className="full"><PlacePicker label="From" value={from} onChange={setFrom} placeholder="Search a place or address" required /></div>
          <div className="full"><PlacePicker label="To" value={to} onChange={setTo} placeholder="SFO, Yosemite, Costco…" required /></div>
          <div className="field"><label htmlFor="pDate">Date</label><input id="pDate" type="date" min={localDateInput()} value={date} onChange={e => setDate(e.target.value)} /></div>
          <div className="field"><label htmlFor="pTime">Leaving at</label><input id="pTime" type="time" value={time} onChange={e => setTime(e.target.value)} /></div>
          <div className="field"><label htmlFor="pCat">Trip type</label><select id="pCat" value={category} onChange={e => setCategory(e.target.value as Category)}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          <div className="field"><label htmlFor="pSeats">{kind === "offer" ? "Open seats" : "Seats needed"}</label><select id="pSeats" value={seats} onChange={e => setSeats(+e.target.value)}>{[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n}>{n}</option>)}</select></div>
          <div className="field">
            <label htmlFor="pMiles">Distance (miles)</label>
            <input id="pMiles" type="number" min={1} inputMode="decimal" placeholder={routing ? "Measuring…" : "Optional"} value={miles} onChange={e => { setMiles(e.target.value); setMilesAuto(false); }} />
            {milesAuto && <span className="hint">Measured from the driving route</span>}
          </div>
          {kind === "offer" && <div className="field"><label htmlFor="pMpg">Car's MPG</label><input id="pMpg" type="number" min={1} step={0.5} inputMode="decimal" value={mpg} onChange={e => setMpg(e.target.value)} /></div>}
          {kind === "offer" && <div className="field"><label htmlFor="pGas">Gas ($/gal)</label><input id="pGas" type="number" min={0} step={0.01} inputMode="decimal" value={gas} onChange={e => setGas(e.target.value)} /></div>}
          <div className="field full"><label htmlFor="pPickup">Pickup spot</label><input id="pPickup" maxLength={120} placeholder="By the Porter bus stop" value={pickup} onChange={e => setPickup(e.target.value)} /></div>
          <div className="field full"><label htmlFor="pNote">Note</label><textarea id="pNote" maxLength={280} placeholder="One carry-on each. Coffee stop on the way." value={note} onChange={e => setNote(e.target.value)} /></div>
          <div className="field full">
            <label htmlFor="pContact">Contact for approved {kind === "offer" ? "riders" : "drivers"}</label>
            <input id="pContact" maxLength={80} placeholder="Phone number or Instagram" value={contact} onChange={e => setContact(e.target.value)} />
            <span className="hint">Sealed. Only people you approve can see it.</span>
          </div>
          {kind === "offer" && <div className="preview full"><span>Each seat pays, with the car full</span><b>{preview != null ? money(preview) : "Add the distance"}</b></div>}
          {err && <p className="err">{err}</p>}
          <div className="form-actions full"><button type="button" className="btn btn-line" onClick={() => nav(-1)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{kind === "offer" ? "Post ride" : "Post request"}</button></div>
        </form>
        <aside className="post-map">
          <RideMap
            routes={haveBoth ? [{ id: "draft", from: [from.lat!, from.lng!], to: [to.lat!, to.lng!], path: route, kind, highlight: true }] : []}
            picked={!haveBoth ? (from.lat != null ? [from.lat, from.lng!] : to.lat != null ? [to.lat, to.lng!] : null) : null}
            height="100%"
          />
          <p className="map-caption">{haveBoth ? (routing ? "Finding the driving route…" : `Route preview${miles ? ` · ${miles} miles` : ""}`) : "Pick both places to see the route and auto-fill the distance."}</p>
        </aside>
      </div>
    </div>
  );
}
