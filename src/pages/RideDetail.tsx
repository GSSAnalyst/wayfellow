import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useApp, useLoader, useRequireUser } from "../lib/app";
import { CATEGORY_LABEL, co2SavedKg, isPast, money, num, perSeat, relText, whenText } from "../lib/format";
import { drivingRoute } from "../lib/geo";
import type { LatLng, Message, Participant, Review, Ride, SeatRequest } from "../lib/types";
import { Avatar, Dialog, Empty, StarInput, Stars } from "../components/Bits";
import { CategoryIcon, IconBack, IconCalendar, IconChat, IconLeaf, IconLock, IconPin, IconSend, IconUnlock } from "../components/Icons";
import { SeatBar } from "../components/RideCard";
import { RideMap } from "../components/RideMap";

export function RideDetail() {
  const { id = "" } = useParams();
  const { api, me, toast } = useApp();
  const nav = useNavigate();
  const requireUser = useRequireUser();

  const ride = useLoader(() => api.getRide(id), [api, id]);
  const myReqs = useLoader(() => (me ? api.myRequests() : Promise.resolve({} as Record<string, SeatRequest>)), [api, me?.id]);
  const r = ride.data;
  const mine = !!r && r.owner_id === me?.id;
  const myReq = myReqs.data?.[id];
  const inCar = mine || myReq?.status === "approved";

  const requests = useLoader(() => (mine ? api.requestsFor(id) : Promise.resolve([] as SeatRequest[])), [api, id, mine]);
  const contact = useLoader(() => (inCar ? api.getContact(id) : Promise.resolve(null)), [api, id, inCar]);
  const people = useLoader(() => (inCar ? api.participants(id) : Promise.resolve([] as Participant[])), [api, id, inCar]);
  const msgs = useLoader(() => (inCar ? api.listMessages(id) : Promise.resolve([] as Message[])), [api, id, inCar]);
  const owner = useLoader(() => (r ? api.getProfileStats(r.owner_id) : Promise.resolve(null)), [api, r?.owner_id]);

  useEffect(() => api.subscribeRide(id, () => { ride.reload(); myReqs.reload(); requests.reload(); msgs.reload(); people.reload(); contact.reload(); }),
    [api, id, ride.reload, myReqs.reload, requests.reload, msgs.reload, people.reload, contact.reload]);

  // Draw a real road route even when the post only stored its endpoints.
  const [path, setPath] = useState<LatLng[] | null>(null);
  useEffect(() => {
    setPath(r?.route ?? null);
    if (!r || r.origin_lat == null || r.dest_lat == null || (r.route && r.route.length > 2)) return;
    let alive = true;
    drivingRoute([r.origin_lat, r.origin_lng!], [r.dest_lat, r.dest_lng!]).then(x => { if (alive && !x.estimated) setPath(x.path); });
    return () => { alive = false; };
  }, [r?.id, r?.route, r?.origin_lat, r?.dest_lat]);

  const [reqOpen, setReqOpen] = useState(false);

  if (ride.loading && !r) return <div className="wrap page"><div className="skeleton tall" /></div>;
  if (!r) return <div className="wrap page"><Empty title="Ride not found" action={<Link className="btn btn-primary" to="/">Back to the board</Link>}>It may have been removed by the person who posted it.</Empty></div>;

  const offer = r.kind === "offer";
  const seats = num(r.seats) || 1;
  const full = offer && r.taken >= seats;
  const price = perSeat(r);
  const past = isPast(r.depart_at);
  const ownerName = mine ? "You" : r.owner?.display_name || "A student";
  const hasMap = r.origin_lat != null && r.dest_lat != null;

  async function act(fn: () => Promise<void>, ok: string) {
    try { await fn(); toast(ok); ride.reload(); myReqs.reload(); requests.reload(); }
    catch (e) { console.error(e); toast("That didn't go through. Try again."); }
  }

  return (
    <div className="wrap page">
      <button className="back" onClick={() => (window.history.length > 1 ? nav(-1) : nav("/"))}><IconBack size={18} /> Back</button>
      <div className="detail">
        <div className="detail-main">
          <div className="detail-head">
            <div className="card-top"><CategoryIcon category={r.category} size={16} />{CATEGORY_LABEL[r.category]}
              {mine ? <span className="pill you">Your post</span> : <span className={"pill " + r.kind}>{offer ? "Driving" : "Needs a ride"}</span>}
              {past && <span className="pill past">Finished</span>}
            </div>
            <h1 className="detail-route">{r.origin}<span className="arrow">→</span>{r.destination}</h1>
            <p className="detail-when"><b>{whenText(r.depart_at)}</b> · {relText(r.depart_at)}</p>
          </div>

          {hasMap && <RideMap routes={[{ id: r.id, from: [r.origin_lat!, r.origin_lng!], to: [r.dest_lat!, r.dest_lng!], path, kind: r.kind, highlight: true }]} height={340} className="detail-map" />}

          <div className="facts">
            {offer ? (
              <div className="fact"><b>{price != null ? money(price) : "Ask"}</b><span>{price != null ? "per seat with the car full" : "driver will set the split"}</span></div>
            ) : (
              <div className="fact"><b>{seats}</b><span>{seats === 1 ? "seat needed" : "seats needed"}</span></div>
            )}
            {r.miles ? <div className="fact"><b>{Math.round(num(r.miles))} mi</b><span>one way</span></div> : null}
            {offer && <div className="fact"><SeatBar seats={seats} taken={r.taken} /><span>seats</span></div>}
            {offer && r.miles && r.taken > 0 ? <div className="fact eco"><b><IconLeaf size={18} /> {co2SavedKg(num(r.miles), r.taken)} kg</b><span>CO₂ saved by sharing</span></div> : null}
          </div>

          {(r.pickup_note || r.note) && (
            <div className="notes">
              {r.pickup_note && <p><IconPin size={17} /> <b>Pickup:</b> {r.pickup_note}</p>}
              {r.note && <p>{r.note}</p>}
            </div>
          )}

          <Link to={`/u/${r.owner_id}`} className="owner-card">
            <Avatar name={ownerName} id={r.owner_id} size={46} />
            <div>
              <b>{ownerName}</b>
              <small>{[r.owner?.college, offer ? "Driver" : "Rider"].filter(Boolean).join(" · ")}</small>
              {owner.data && <span className="owner-rating"><Stars value={owner.data.avg_stars} size={14} /> {owner.data.rating_count ? `${owner.data.avg_stars?.toFixed(1)} · ${owner.data.rating_count} ${owner.data.rating_count === 1 ? "review" : "reviews"}` : "New on Wayfellow"}</span>}
            </div>
            <span className="go">Profile →</span>
          </Link>
        </div>

        <aside className="detail-side">
          {/* Contact */}
          {inCar ? (
            <div className="sealed open"><IconUnlock size={18} /><span>{mine ? "Shared with approved people: " : "Contact: "}<b>{contact.data ?? (contact.loading ? "Loading…" : "Not set")}</b></span></div>
          ) : (
            <div className="sealed"><IconLock size={18} /><span>Contact and chat unlock when {offer ? "the driver approves your request" : "they accept your offer"}.</span></div>
          )}

          {/* Action */}
          {!mine && !past && (
            <div className="panel action">
              {!myReq ? (
                <button className="btn btn-primary btn-block" disabled={full} onClick={() => requireUser(() => setReqOpen(true))}>{full ? "Car is full" : offer ? "Request a seat" : "Offer to drive"}</button>
              ) : (
                <div className="req-state">
                  <span className={"status " + myReq.status}>{{ pending: "Request sent. Waiting on " + ownerName + ".", approved: "You're in! 🎉", declined: "Not this time." }[myReq.status]}</span>
                  {myReq.status !== "declined" && <button className="text-btn" onClick={() => act(() => api.cancelRequest(myReq.id), myReq.status === "approved" ? "You left the ride" : "Request cancelled")}>{myReq.status === "approved" ? "Leave ride" : "Cancel request"}</button>}
                </div>
              )}
              <div className="side-tools">
                <button className="text-btn" onClick={() => downloadIcs(r)}><IconCalendar size={16} /> Add to calendar</button>
                <button className="text-btn" onClick={() => share(r, toast)}>Share</button>
              </div>
            </div>
          )}

          {/* Owner: requests */}
          {mine && (
            <div className="panel">
              <h3 className="panel-title">{offer ? "Seat requests" : "Drivers offering"}</h3>
              {requests.data && requests.data.length ? requests.data.map(q => (
                <div className="req" key={q.id}>
                  <Avatar name={q.rider?.display_name || "?"} id={q.rider_id} size={34} />
                  <div className="who">
                    <Link to={`/u/${q.rider_id}`}><b>{q.rider?.display_name || "A student"}</b></Link>
                    <small>{[q.rider?.college, q.message].filter(Boolean).join(" · ") || "No message"}</small>
                  </div>
                  {q.status === "pending" && !past ? (
                    <div className="req-actions">
                      <button className="btn btn-ok btn-sm" disabled={offer && full} onClick={() => act(() => api.setRequestStatus(q.id, "approved"), "Approved. They can see your contact and chat now.")}>Approve</button>
                      <button className="text-btn" onClick={() => act(() => api.setRequestStatus(q.id, "declined"), "Declined")}>Decline</button>
                    </div>
                  ) : <span className={"state " + q.status}>{q.status === "approved" ? "Approved" : q.status === "declined" ? "Declined" : "Pending"}</span>}
                </div>
              )) : <p className="muted">No requests yet. You'll {api.mode === "live" ? "get an email and " : ""}see them here as they come in.</p>}
              <div className="side-tools">
                <button className="text-btn" onClick={() => downloadIcs(r)}><IconCalendar size={16} /> Add to calendar</button>
                <button className="text-btn" onClick={() => share(r, toast)}>Share</button>
                <button className="text-btn danger" onClick={() => { if (window.confirm("Remove this ride? Requests, chat, and contact details go with it.")) api.deleteRide(r.id).then(() => { toast("Ride removed"); nav("/"); }).catch(() => toast("Couldn't remove it. Try again.")); }}>Remove ride</button>
              </div>
            </div>
          )}

          {/* Chat */}
          {inCar && <Chat rideId={r.id} meId={me!.id} people={people.data ?? []} messages={msgs.data ?? []} onSent={msgs.reload} />}

          {/* Ratings */}
          {inCar && past && <RateRide ride={r} meId={me!.id} people={people.data ?? []} />}
        </aside>
      </div>

      <RequestDialog open={reqOpen} ride={r} onClose={() => setReqOpen(false)} onDone={() => { setReqOpen(false); myReqs.reload(); }} />
    </div>
  );
}

function RequestDialog({ open, ride, onClose, onDone }: { open: boolean; ride: Ride; onClose: () => void; onDone: () => void }) {
  const { api, profile, toast } = useApp();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMsg(""); setErr(""); } }, [open]);
  const offer = ride.kind === "offer";
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try { await api.requestSeat(ride.id, msg.trim()); toast(offer ? "Request sent. You'll get the contact once approved." : "Offer sent"); onDone(); }
    catch (ex) { setErr(/duplicate|unique/i.test(String((ex as Error)?.message)) ? "You've already sent a request for this ride." : "Couldn't send that. Try again."); }
    finally { setBusy(false); }
  }
  return (
    <Dialog open={open} onClose={onClose} title={offer ? "Request a seat" : "Offer to drive"} narrow>
      <form className="form-grid" onSubmit={submit} noValidate>
        <p className="lead">{ride.origin} to {ride.destination}, {whenText(ride.depart_at)}. They'll see your name{profile?.college ? ", college," : ""} and this message.</p>
        <div className="field full"><label htmlFor="rqMsg">Message</label><textarea id="rqMsg" maxLength={200} placeholder={offer ? "Hi! One backpack, happy to pitch in for gas." : "I'm driving that way, happy to take you."} value={msg} onChange={e => setMsg(e.target.value)} autoFocus /><span className="hint">Optional, but people say yes faster when you say hi.</span></div>
        {err && <p className="err">{err}</p>}
        <div className="form-actions full"><button type="button" className="btn btn-line" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{offer ? "Send request" : "Send offer"}</button></div>
      </form>
    </Dialog>
  );
}

function Chat({ rideId, meId, people, messages, onSent }: { rideId: string; meId: string; people: Participant[]; messages: Message[]; onSent: () => void }) {
  const { api, toast } = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const names = useMemo(() => Object.fromEntries(people.map(p => [p.id, p.display_name])), [people]);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try { await api.sendMessage(rideId, body); setText(""); onSent(); }
    catch { toast("Message didn't send. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="panel chat">
      <h3 className="panel-title"><IconChat size={18} /> Ride chat <span className="chat-people">{people.map(p => p.id === meId ? "You" : p.display_name).join(", ")}</span></h3>
      <div className="chat-log" ref={box} aria-live="polite">
        {messages.length === 0 && <p className="muted center">Say hi and sort out the pickup details.</p>}
        {messages.map((m, i) => {
          const own = m.sender_id === meId;
          const showName = !own && messages[i - 1]?.sender_id !== m.sender_id;
          return (
            <div key={m.id} className={"bubble-row" + (own ? " own" : "")}>
              {showName && <span className="bubble-name">{names[m.sender_id] ?? "Student"}</span>}
              <div className="bubble" title={new Date(m.created_at).toLocaleString()}>{m.body}</div>
            </div>
          );
        })}
      </div>
      <form className="chat-form" onSubmit={send}>
        <input aria-label="Message" placeholder="Message the car" maxLength={1000} value={text} onChange={e => setText(e.target.value)} />
        <button className="btn btn-primary btn-icon" disabled={busy || !text.trim()} aria-label="Send"><IconSend size={18} /></button>
      </form>
    </div>
  );
}

function RateRide({ ride, meId, people }: { ride: Ride; meId: string; people: Participant[] }) {
  const { api, toast } = useApp();
  const given = useLoader(() => api.ratingsGiven(ride.id), [api, ride.id]);
  const others = people.filter(p => p.id !== meId);
  const done = new Set((given.data ?? []).map((g: Review) => g.ratee_id));
  const [stars, setStars] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  if (!others.length) return null;
  return (
    <div className="panel">
      <h3 className="panel-title">How was the ride?</h3>
      {others.map(p => (
        <div className="rate-row" key={p.id}>
          <div className="rate-who"><Avatar name={p.display_name} id={p.id} size={32} /><b>{p.display_name}</b><small>{p.is_owner ? "Driver" : "Rider"}</small></div>
          {done.has(p.id) ? <p className="muted">Thanks, your rating is in.</p> : (
            <>
              <StarInput value={stars[p.id] ?? 0} onChange={n => setStars(s => ({ ...s, [p.id]: n }))} label={`Rate ${p.display_name}`} />
              {stars[p.id] ? (
                <div className="rate-form">
                  <input maxLength={300} placeholder="Add a short comment (optional)" value={comments[p.id] ?? ""} onChange={e => setComments(c => ({ ...c, [p.id]: e.target.value }))} />
                  <button className="btn btn-primary btn-sm" onClick={async () => {
                    try { await api.rate(ride.id, p.id, stars[p.id], (comments[p.id] ?? "").trim()); toast("Rating saved"); given.reload(); }
                    catch { toast("Couldn't save that rating."); }
                  }}>Submit</button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function downloadIcs(r: Ride) {
  const start = new Date(r.depart_at);
  const end = new Date(start.getTime() + Math.max(1, num(r.miles) / 45) * 36e5);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\;,]/g, m => "\\" + m).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Wayfellow//Campus rides//EN", "BEGIN:VEVENT",
    `UID:${r.id}@wayfellow`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`,
    `SUMMARY:${esc(`Ride: ${r.origin} → ${r.destination}`)}`,
    `LOCATION:${esc(r.pickup_note || r.origin)}`,
    `DESCRIPTION:${esc((r.note || "") + "\n" + window.location.href)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "wayfellow-ride.ics"; a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function share(r: Ride, toast: (m: string) => void) {
  const url = window.location.href;
  const text = `${r.origin} → ${r.destination}, ${whenText(r.depart_at)} on Wayfellow`;
  try {
    if (navigator.share) await navigator.share({ title: "Wayfellow ride", text, url });
    else { await navigator.clipboard.writeText(url); toast("Link copied"); }
  } catch { /* user closed the share sheet */ }
}
