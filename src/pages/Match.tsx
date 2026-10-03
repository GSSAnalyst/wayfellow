import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoader, useRequireUser } from "../lib/app";
import { CONFIG } from "../lib/config";
import { localDateInput, num } from "../lib/format";
import { haversineMiles } from "../lib/geo";
import type { Ride, SeatRequest } from "../lib/types";
import { Empty, Skeletons } from "../components/Bits";
import { IconSpark } from "../components/Icons";
import { PlacePicker, type PlaceValue } from "../components/PlacePicker";
import { RideCard } from "../components/RideCard";
import { RideMap } from "../components/RideMap";

const FLEX = [{ v: 0, l: "That day" }, { v: 1, l: "± 1 day" }, { v: 3, l: "± 3 days" }, { v: 99, l: "Any day" }];
const NEAR_MILES = 30;

interface Hit { ride: Ride; destMiles: number | null; dayDiff: number; score: number }

export function Match() {
  const { api, me, setSignInOpen } = useApp();
  const nav = useNavigate();
  const requireUser = useRequireUser();
  const canSee = api.mode === "demo" || !!me;
  const rides = useLoader(() => (canSee ? api.listRides() : Promise.resolve([] as Ride[])), [api, canSee]);
  const reqs = useLoader(() => (canSee ? api.myRequests() : Promise.resolve({} as Record<string, SeatRequest>)), [api, canSee, me?.id]);

  const [to, setTo] = useState<PlaceValue>({ label: "", lat: null, lng: null });
  const [date, setDate] = useState(localDateInput());
  const [flex, setFlex] = useState(3);
  const [hover, setHover] = useState<string | null>(null);

  const hits: Hit[] = useMemo(() => {
    const q = to.label.trim().toLowerCase();
    if (!q && to.lat == null) return [];
    const want = new Date(date + "T12:00").getTime();
    const out: Hit[] = [];
    for (const r of rides.data ?? []) {
      if (r.kind !== "offer" || r.owner_id === me?.id || r.taken >= num(r.seats) || new Date(r.depart_at).getTime() < Date.now()) continue;
      const dayDiff = Math.abs(Math.round((new Date(r.depart_at).setHours(12, 0, 0, 0) - want) / 864e5));
      if (flex !== 99 && dayDiff > flex) continue;
      let destMiles: number | null = null;
      if (to.lat != null && to.lng != null && r.dest_lat != null && r.dest_lng != null) {
        destMiles = haversineMiles([to.lat, to.lng], [r.dest_lat, r.dest_lng]);
        if (destMiles > NEAR_MILES) continue;
      } else if (!r.destination.toLowerCase().includes(q.split(",")[0])) continue;
      out.push({ ride: r, destMiles, dayDiff, score: (destMiles ?? 5) + dayDiff * 15 });
    }
    return out.sort((a, b) => a.score - b.score);
  }, [rides.data, to, date, flex, me?.id]);

  const searched = !!to.label.trim();
  const badge = (h: Hit) => {
    const where = h.destMiles == null ? "Same destination" : h.destMiles < 1 ? "Right at your destination" : `${Math.round(h.destMiles)} mi from your destination`;
    const when = h.dayDiff === 0 ? "same day" : `${h.dayDiff} ${h.dayDiff === 1 ? "day" : "days"} off`;
    return `${where} · ${when}`;
  };
  const askUrl = `/post?kind=want&to=${encodeURIComponent(to.label)}${to.lat != null ? `&lat=${to.lat}&lng=${to.lng}` : ""}&date=${date}`;

  return (
    <div className="wrap page">
      <div className="match-hero">
        <span className="eyebrow"><IconSpark size={16} /> Smart match</span>
        <h1 className="page-title">Where are you headed?</h1>
        <p className="sub">We'll find drivers going near your destination around your date, even if they typed it differently.</p>
      </div>

      {!canSee ? (
        <Empty title="Sign in to find rides" action={<button className="btn btn-primary" onClick={() => setSignInOpen(true)}>Sign in</button>}>Matching uses the live board, which is only visible to signed-in {CONFIG.campusName} students.</Empty>
      ) : (
        <>
          <div className="panel match-form">
            <div className="match-to"><PlacePicker label="Destination" value={to} onChange={setTo} placeholder="SFO, LA, Tahoe, home…" /></div>
            <div className="field"><label htmlFor="mDate">Around</label><input id="mDate" type="date" min={localDateInput()} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="mFlex">Flexibility</label><select id="mFlex" value={flex} onChange={e => setFlex(+e.target.value)}>{FLEX.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}</select></div>
          </div>

          {searched && hits.length > 0 && to.lat != null && (
            <RideMap
              className="match-map"
              height={300}
              picked={[to.lat, to.lng!]}
              routes={hits.filter(h => h.ride.origin_lat != null && h.ride.dest_lat != null).map(h => ({ id: h.ride.id, from: [h.ride.origin_lat!, h.ride.origin_lng!], to: [h.ride.dest_lat!, h.ride.dest_lng!], path: h.ride.route, kind: "offer", label: `${h.ride.origin} → ${h.ride.destination}`, highlight: hover === h.ride.id }))}
              onSelect={id => nav(`/ride/${id}`)}
            />
          )}

          <div className="grid">
            {rides.loading && !rides.data ? <Skeletons /> : !searched ? (
              <Empty title="Pick a destination">Type a place or drop a pin, and matching rides show up here instantly.</Empty>
            ) : hits.length === 0 ? (
              <Empty title="No drivers heading there yet" action={<button className="btn btn-primary" onClick={() => requireUser(() => nav(askUrl))}>Post a ride request</button>}>
                Post a request and drivers going that way can offer you a seat.
              </Empty>
            ) : hits.map(h => <RideCard key={h.ride.id} ride={h.ride} meId={me?.id} myReq={reqs.data?.[h.ride.id]} badge={badge(h)} highlight={hover === h.ride.id} onHover={setHover} />)}
          </div>
          {searched && hits.length > 0 && <p className="muted center top-gap">Not quite right? <button className="text-btn inline" onClick={() => requireUser(() => nav(askUrl))}>Post a ride request</button> so drivers can find you.</p>}
        </>
      )}
    </div>
  );
}
