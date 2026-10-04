import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp, useLoader } from "../lib/app";
import { co2SavedKg, isPast, money, num } from "../lib/format";
import type { Trip } from "../lib/types";
import { Empty, Skeletons } from "../components/Bits";
import { IconLeaf } from "../components/Icons";
import { RideCard } from "../components/RideCard";

export function MyTrips() {
  const { api, me, setSignInOpen } = useApp();
  const trips = useLoader(() => (me ? api.myTrips() : Promise.resolve([] as Trip[])), [api, me?.id]);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { upcoming, past, stats } = useMemo(() => {
    const all = trips.data ?? [];
    const up = all.filter(t => !isPast(t.ride.depart_at)).sort((a, b) => a.ride.depart_at.localeCompare(b.ride.depart_at));
    const pa = all.filter(t => isPast(t.ride.depart_at)).sort((a, b) => b.ride.depart_at.localeCompare(a.ride.depart_at));
    let miles = 0, kg = 0, earned = 0;
    for (const t of pa) {
      const m = num(t.ride.miles);
      if (t.role === "poster") continue;
      miles += m;
      if (t.role === "driver") { kg += co2SavedKg(m, t.ride.taken); earned += num(t.ride.price) * t.ride.taken; }
      else kg += co2SavedKg(m, 1);
    }
    return { upcoming: up, past: pa, stats: { trips: pa.filter(t => t.role !== "poster").length, miles, kg, earned } };
  }, [trips.data]);

  if (!me) return <div className="wrap page"><Empty title="Sign in to see your trips" action={<button className="btn btn-primary" onClick={() => setSignInOpen(true)}>Sign in</button>} /></div>;

  const list = tab === "upcoming" ? upcoming : past;
  return (
    <div className="wrap page">
      <h1 className="page-title">My trips</h1>
      <div className="impact">
        <div><b>{stats.trips}</b><span>shared trips</span></div>
        <div><b>{Math.round(stats.miles).toLocaleString()}</b><span>miles shared</span></div>
        <div className="eco"><b><IconLeaf size={20} /> {stats.kg} kg</b><span>CO₂ kept out of the air</span></div>
        <div><b>{money(stats.earned)}</b><span>earned from riders as a driver</span></div>
      </div>
      <div className="seg tabs" role="tablist">
        <button role="tab" aria-selected={tab === "upcoming"} aria-pressed={tab === "upcoming"} onClick={() => setTab("upcoming")}>Upcoming ({upcoming.length})</button>
        <button role="tab" aria-selected={tab === "past"} aria-pressed={tab === "past"} onClick={() => setTab("past")}>History ({past.length})</button>
      </div>
      <div className="grid">
        {trips.loading && !trips.data ? <Skeletons /> : list.length === 0 ? (
          <Empty title={tab === "upcoming" ? "Nothing coming up" : "No past trips yet"} action={<Link className="btn btn-primary" to="/">Browse the board</Link>}>
            {tab === "upcoming" ? "Rides you post or get approved for show up here." : "After a ride, come back here to rate the people you rode with."}
          </Empty>
        ) : list.map(t => (
          <RideCard key={t.ride.id} ride={t.ride} meId={me.id} badge={tab === "past" ? (t.role === "driver" ? "You drove · tap to rate riders" : t.role === "rider" ? "You rode · tap to rate the driver" : undefined) : t.role === "rider" ? "You're riding" : undefined} />
        ))}
      </div>
    </div>
  );
}
