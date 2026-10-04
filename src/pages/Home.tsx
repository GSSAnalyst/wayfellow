import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, useLoader, useRequireUser } from "../lib/app";
import { nearOf } from "../lib/area";
import { useReveal, useTilt } from "../lib/motion";
import { CATEGORIES, num, priceText, relText, seatPrice } from "../lib/format";
import type { Category, Ride, SeatRequest } from "../lib/types";
import type { ReactNode } from "react";
import { AreaBar } from "../components/AreaBar";
import { Empty, Skeletons } from "../components/Bits";
import { DemoBanner } from "../components/Chrome";
import { HeroRoad } from "../components/HeroRoad";
import { CategoryIcon, IconLeaf, IconList, IconLock, IconMail, IconMap, IconSearch, IconShield, IconChat } from "../components/Icons";
import { RideCard } from "../components/RideCard";
import { RideMap, type MapRoute } from "../components/RideMap";

type KindFilter = "all" | "offer" | "want" | "mine";

const Hero3D = lazy(() => import("../components/Hero3D"));
const hasWebGL = () => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } };

/** The 3D highway, with the 2D canvas while it loads or if WebGL isn't available. */
function HeroScene() {
  const [failed, setFailed] = useState(() => !hasWebGL());
  const fail = useCallback(() => setFailed(true), []);
  if (failed) return <HeroRoad />;
  return <Suspense fallback={<HeroRoad />}><Hero3D onFail={fail} /></Suspense>;
}

export function Home() {
  const { api, me, ready, setSignInOpen, area } = useApp();
  const nav = useNavigate();
  const requireUser = useRequireUser();
  const canSee = api.mode === "demo" || !!me;

  const near = nearOf(area);
  const rides = useLoader(() => (canSee ? api.listRides(near) : Promise.resolve([] as Ride[])), [api, canSee, near?.center[0], near?.center[1], near?.miles]);
  const reqs = useLoader(() => (canSee ? api.myRequests() : Promise.resolve({} as Record<string, SeatRequest>)), [api, canSee, me?.id]);
  useEffect(() => {
    if (!canSee) return;
    return api.subscribeBoard(() => { rides.reload(); reqs.reload(); });
  }, [api, canSee, rides.reload, reqs.reload]);

  const [cat, setCat] = useState<Category | "all">("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [hover, setHover] = useState<string | null>(null);

  const list = useMemo(() => {
    const all = rides.data ?? [];
    const mine = (r: Ride) => r.owner_id === me?.id || !!reqs.data?.[r.id];
    const qq = q.trim().toLowerCase();
    return all.filter(r =>
      (cat === "all" || r.category === cat) &&
      (kind === "all" || (kind === "mine" ? mine(r) : r.kind === kind)) &&
      (!qq || `${r.origin} ${r.destination} ${r.note ?? ""}`.toLowerCase().includes(qq)));
  }, [rides.data, reqs.data, cat, kind, q, me?.id]);

  const mapRoutes: MapRoute[] = useMemo(() => list
    .filter(r => r.origin_lat != null && r.dest_lat != null)
    .map(r => ({ id: r.id, from: [r.origin_lat!, r.origin_lng!], to: [r.dest_lat!, r.dest_lng!], path: r.route, kind: r.kind, label: `${r.origin} → ${r.destination}`, highlight: hover === r.id })), [list, hover]);

  const post = (k: "offer" | "want") => requireUser(() => nav(`/post?kind=${k}`));
  useReveal();

  return (
    <>
      <section className="hero">
        <HeroScene />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="hero-kicker"><i /> Live across US campuses</span>
            <h1>Everyone's going somewhere. <span className="hl-text">Ride together.</span></h1>
            <p className="lede">A ride board for college students across the US. Post a trip, grab a seat, chat with your driver, and pay what the driver asks without the group-chat chaos.</p>
            <div className="ctas">
              <button className="btn btn-hud" onClick={() => post("offer")}>I'm driving</button>
              <button className="btn btn-night" onClick={() => nav("/match")}>Find me a ride</button>
            </div>
          </div>
          <Hud rides={rides.data} signedOut={!canSee && ready} />
        </div>
      </section>

      <DemoBanner />

      <section className="block" id="board">
        <div className="wrap">
          <div className="head" data-reveal>
            <div>
              <h2>The ride board</h2>
              <p className="sub">Request a seat and the driver decides. Contact details and the ride chat unlock once you're approved.</p>
            </div>
            <button className="btn btn-primary" onClick={() => post("offer")}>Post a ride</button>
          </div>

          {!canSee ? (
            <div className="grid"><Empty title="Sign in to see the board" action={<button className="btn btn-primary" onClick={() => setSignInOpen(true)}>Sign in with your .edu email</button>}>Rides are only visible to students signed in with a school .edu email.</Empty></div>
          ) : (
            <>
              <AreaBar />
              <div className="filters">
                <div className="chips" role="group" aria-label="Trip type">
                  <button className="chip" aria-pressed={cat === "all"} onClick={() => setCat("all")}>Everything</button>
                  {CATEGORIES.map(c => (
                    <button key={c.id} className="chip" aria-pressed={cat === c.id} onClick={() => setCat(c.id)}><CategoryIcon category={c.id} size={16} />{c.label}</button>
                  ))}
                </div>
                <div className="row">
                  <div className="seg" role="group" aria-label="Show">
                    {([["all", "All"], ["offer", "Driving"], ["want", "Need a ride"], ["mine", "Mine"]] as [KindFilter, string][]).map(([k, l]) => (
                      <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>
                    ))}
                  </div>
                  <div className="seg" role="group" aria-label="View">
                    <button aria-pressed={view === "list"} onClick={() => setView("list")}><IconList size={16} /> List</button>
                    <button aria-pressed={view === "map"} onClick={() => setView("map")}><IconMap size={16} /> Map</button>
                  </div>
                  <label className="search"><span className="sr">Search by place</span><IconSearch size={17} /><input type="search" placeholder="Search a city or place" value={q} onChange={e => setQ(e.target.value)} /></label>
                </div>
              </div>

              {view === "map" && list.length > 0 && (
                <div className="map-board">
                  <RideMap routes={mapRoutes} height="100%" onSelect={id => nav(`/ride/${id}`)} />
                  <p className="map-legend"><i className="lg offer" /> Driving <i className="lg want" /> Needs a ride · Tap a route to open it</p>
                </div>
              )}

              <div className={"grid" + (view === "map" ? " grid-under-map" : "")} aria-live="polite">
                {rides.loading && !rides.data ? <Skeletons /> : rides.error && !rides.data ? (
                  <Empty title="Couldn't load rides" action={<button className="btn btn-primary" onClick={rides.reload}>Try again</button>}>Check your connection and try again.</Empty>
                ) : list.length === 0 ? (
                  <Empty
                    title={(rides.data ?? []).length ? "Nothing matches that" : near ? "No rides leaving near you yet" : "The board is empty"}
                    action={<button className="btn btn-primary" onClick={() => post(kind === "want" ? "want" : "offer")}>{(rides.data ?? []).length ? "Post a ride" : "Post the first ride"}</button>}
                  >
                    {(rides.data ?? []).length ? "Try a different filter, or post the ride you're looking for so drivers can find you." : near ? "Widen the distance above, or be the first to post from your area." : "Be the first. Post a trip you're driving, or ask for a ride and see who bites."}
                  </Empty>
                ) : list.map((r, i) => <RideCard key={r.id} index={i} ride={r} meId={me?.id} myReq={reqs.data?.[r.id]} highlight={hover === r.id} onHover={view === "map" ? setHover : undefined} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="block tight" id="privacy">
        <div className="wrap">
          <div className="privacy" data-reveal>
            <div className="privacy-intro">
              <IconShield size={64} className="privacy-mark" />
              <h2>Built so strangers can't see you</h2>
              <p className="sub">Privacy is enforced by the database's own rules, not just hidden on the page. Even someone poking at the API gets nothing they shouldn't.</p>
            </div>
            <div className="points">
              <Point icon={<IconMail size={22} />} title="Students only">Sign-in is a one-time link sent to your school .edu inbox. No passwords to leak, and the database rejects anyone without a .edu address. Every post shows the poster's school.</Point>
              <Point icon={<IconLock size={22} />} title="Contact details stay sealed">Your phone or handle is shown only to riders you approve. Everyone else sees a locked field.</Point>
              <Point icon={<IconChat size={22} />} title="Private ride chat">Only the driver and approved riders can read or send messages in a ride's chat.</Point>
              <Point icon={<IconShield size={22} />} title="Encrypted in transit and at rest">Every connection runs over HTTPS, and Supabase encrypts the stored database at rest.</Point>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="point"><div className="ico">{icon}</div><div><h3>{title}</h3><p>{children}</p></div></div>;
}

function Hud({ rides, signedOut }: { rides: Ride[] | null; signedOut: boolean }) {
  const nav = useNavigate();
  const tilt = useTilt<HTMLElement>(9);
  const offers = useMemo(() => (rides ?? []).filter(r => r.kind === "offer" && new Date(r.depart_at).getTime() > Date.now() && r.taken < num(r.seats)).slice(0, 5), [rides]);
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (offers.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI(x => x + 1), 4500);
    return () => window.clearInterval(t);
  }, [offers]);
  const seatsMoving = (rides ?? []).filter(r => r.kind === "offer").reduce((s, r) => s + Math.min(r.taken, num(r.seats)), 0);
  const kg = Math.round((rides ?? []).filter(r => r.kind === "offer").reduce((s, r) => s + num(r.miles) * 0.404 * r.taken, 0));
  const r = offers.length ? offers[i % offers.length] : null;
  const p = r ? seatPrice(r) : null;

  return (
    <aside className="hud tilt" ref={tilt} aria-label="Next departure">
      <div className="hud-top"><span className="live"><i />Next departure</span><span>{offers.length ? `${offers.length} ${offers.length === 1 ? "ride" : "rides"}` : ""}</span></div>
      {r ? (
        <button className="hud-body" key={r.id} onClick={() => nav(`/ride/${r.id}`)}>
          <div className="hud-route">{r.origin}<span className="arrow">→</span>{r.destination}</div>
          <div className="hud-meta">
            <div><b>{relText(r.depart_at).replace(/^in /, "")}</b><span>Leaves in</span></div>
            <div><b>{num(r.seats) - r.taken}</b><span>Seats open</span></div>
            <div><b>{priceText(p)}</b><span>Per seat</span></div>
          </div>
        </button>
      ) : (
        <div className="hud-body static"><div className="hud-route">{signedOut ? "Sign in to see who's leaving next" : rides ? "No drives posted yet" : "Scanning the board…"}</div></div>
      )}
      {offers.length > 1 && <div className="hud-dots">{offers.map((o, k) => <i key={o.id} className={k === i % offers.length ? "on" : ""} />)}</div>}
      {seatsMoving > 0 && <div className="hud-impact"><IconLeaf size={16} /> {seatsMoving} shared {seatsMoving === 1 ? "seat" : "seats"} on the board · about {kg} kg CO₂ kept out of the air</div>}
    </aside>
  );
}
