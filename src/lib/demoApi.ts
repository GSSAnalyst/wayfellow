import { CONFIG } from "./config";
import type { Api, Me, Message, Participant, Profile, ProfileStats, Review, Ride, RideInput, SeatRequest, Trip } from "./types";

/**
 * Demo backend: everything lives in this browser's localStorage, with sample students and rides,
 * so you can try every feature before connecting Supabase. Other "students" respond automatically.
 */

type StoredRide = Omit<Ride, "owner" | "taken">;
interface DB {
  v: number;
  profiles: Record<string, Profile>;
  rides: StoredRide[];
  contacts: Record<string, string>;
  requests: SeatRequest[];
  messages: Message[];
  ratings: Review[];
}

const KEY = "wayfellow-demo-v2";
const ME: Me = { id: "demo-me", email: "you@" + CONFIG.campusDomain };
const uid = (p: string) => p + Math.random().toString(36).slice(2, 9);

function at(days: number, h: number, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function seed(): DB {
  const base = { mpg: null, gas_price: null, pickup_note: null, route: null } as const;
  const rides: StoredRide[] = [
    { ...base, id: "s1", owner_id: "maya", kind: "offer", category: "airport", origin: "East Remote Lot", destination: "SFO Terminal 2", origin_lat: 36.9907, origin_lng: -122.0537, dest_lat: 37.6164, dest_lng: -122.3858, depart_at: at(2, 6, 30), seats: 3, miles: 82, mpg: 32, gas_price: 4.9, note: "Early flight crowd. One carry-on plus a backpack each.", pickup_note: "By the bus stop shelter" },
    { ...base, id: "s2", owner_id: "jordan", kind: "offer", category: "trip", origin: "Crown College", destination: "Yosemite Valley", origin_lat: 37.0003, origin_lng: -122.0548, dest_lat: 37.7456, dest_lng: -119.5936, depart_at: at(4, 7), seats: 4, miles: 205, mpg: 28, gas_price: 4.9, note: "Day hike to Mist Trail, back by 10pm. Snacks on me." },
    { ...base, id: "s3", owner_id: "aiden", kind: "want", category: "home", origin: "Campus", destination: "Fresno", origin_lat: 36.9978, origin_lng: -122.0553, dest_lat: 36.7378, dest_lng: -119.7871, depart_at: at(9, 15), seats: 1, miles: 150, note: "Heading home for the long weekend. Happy to cover my share and play DJ." },
    { ...base, id: "s4", owner_id: "priya", kind: "offer", category: "errand", origin: "Quarry Plaza", destination: "Costco, Santa Cruz", origin_lat: 36.9978, origin_lng: -122.0553, dest_lat: 36.9855, dest_lng: -121.9845, depart_at: at(1, 17, 30), seats: 2, miles: 8, mpg: 30, gas_price: 4.9, note: "Bulk snack run. Trunk space for two carts." },
    { ...base, id: "s5", owner_id: ME.id, kind: "offer", category: "airport", origin: "Porter College", destination: "San José Airport (SJC)", origin_lat: 36.9944, origin_lng: -122.0651, dest_lat: 37.3639, dest_lng: -121.9289, depart_at: at(3, 14), seats: 3, miles: 35, mpg: 34, gas_price: 4.9, note: "Thanksgiving flights. Room for medium suitcases.", pickup_note: "Porter circle" },
    { ...base, id: "s6", owner_id: "jordan", kind: "offer", category: "trip", origin: "Campus", destination: "Monterey Bay Aquarium", origin_lat: 36.9978, origin_lng: -122.0553, dest_lat: 36.6182, dest_lng: -121.9019, depart_at: at(-5, 10), seats: 3, miles: 44, mpg: 28, gas_price: 4.8, note: "Aquarium day!" },
    { ...base, id: "s7", owner_id: "maya", kind: "offer", category: "event", origin: "East Remote Lot", destination: "Chase Center, San Francisco", origin_lat: 36.9907, origin_lng: -122.0537, dest_lat: 37.768, dest_lng: -122.3877, depart_at: at(6, 16), seats: 2, miles: 78, mpg: 32, gas_price: 4.9, note: "Concert night. Leaving right after the show, back around 1am." },
  ];
  return {
    v: 2,
    profiles: {
      [ME.id]: { id: ME.id, display_name: "You", college: "Porter", email_alerts: true },
      maya: { id: "maya", display_name: "Maya", college: "Porter" },
      jordan: { id: "jordan", display_name: "Jordan", college: "Crown" },
      aiden: { id: "aiden", display_name: "Aiden", college: "Oakes" },
      priya: { id: "priya", display_name: "Priya", college: "Cowell" },
    },
    rides,
    contacts: { s1: "Text (831) 555-0142", s2: "Instagram @jordan.drives", s4: "Text (831) 555-0199", s5: "Text me at (831) 555-0107", s6: "Instagram @jordan.drives", s7: "Text (831) 555-0142" },
    requests: [
      { id: "q1", ride_id: "s2", rider_id: "priya", status: "approved", message: null },
      { id: "q2", ride_id: "s5", rider_id: "priya", status: "approved", message: "Flight at 6pm!" },
      { id: "q3", ride_id: "s5", rider_id: "aiden", status: "pending", message: "Hey! Flying home Wednesday, one suitcase. Can Venmo for gas." },
      { id: "q4", ride_id: "s6", rider_id: ME.id, status: "approved", message: null },
      { id: "q5", ride_id: "s6", rider_id: "maya", status: "approved", message: null },
    ],
    messages: [
      { id: "m1", ride_id: "s5", sender_id: "priya", body: "Hey! Is it cool if I bring a small cooler bag too?", created_at: at(-1, 19, 4) },
      { id: "m2", ride_id: "s6", sender_id: "jordan", body: "Leaving from the base of campus at 10 sharp 🐙", created_at: at(-6, 18) },
    ],
    ratings: [
      { id: "r1", ride_id: "x1", rater_id: "priya", ratee_id: "jordan", stars: 5, comment: "Great playlist, very safe driver.", created_at: at(-20, 12) },
      { id: "r2", ride_id: "x2", rater_id: "aiden", ratee_id: "jordan", stars: 5, comment: "On time and super chill.", created_at: at(-34, 12) },
      { id: "r3", ride_id: "x3", rater_id: "jordan", ratee_id: "maya", stars: 5, comment: "Easy pickup, split gas right away.", created_at: at(-12, 12) },
      { id: "r4", ride_id: "x4", rater_id: "priya", ratee_id: "maya", stars: 4, comment: null, created_at: at(-40, 12) },
      { id: "r5", ride_id: "x5", rater_id: "maya", ratee_id: ME.id, stars: 5, comment: "Great company on a long drive.", created_at: at(-15, 12) },
    ],
  };
}

export function createDemoApi(): Api {
  let db: DB;
  try { db = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { db = null as unknown as DB; }
  if (!db || db.v !== 2) db = seed();
  const listeners = new Set<() => void>();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } };
  const emit = () => { save(); listeners.forEach(fn => fn()); };
  const later = (ms: number, fn: () => void) => window.setTimeout(() => { fn(); emit(); }, ms);

  const owner = (id: string) => { const p = db.profiles[id]; return p ? { display_name: p.display_name, college: p.college } : null; };
  const taken = (rideId: string) => db.requests.filter(q => q.ride_id === rideId && q.status === "approved").length;
  const full = (r: StoredRide): Ride => ({ ...r, owner: owner(r.owner_id), taken: taken(r.id) });
  const isParticipant = (rideId: string, u: string) => {
    const r = db.rides.find(x => x.id === rideId);
    return !!r && (r.owner_id === u || db.requests.some(q => q.ride_id === rideId && q.rider_id === u && q.status === "approved"));
  };

  const REPLIES = ["Sounds good! 👍", "Perfect, see you there.", "Works for me. I'll be there 5 min early.", "Haha yes. Want me to bring snacks?"];

  return {
    mode: "demo",
    async getSession() { return ME; },
    onAuth() { return () => {}; },
    async sendMagicLink() {},
    async signOut() {},

    async getProfile(id) { return db.profiles[id] ?? null; },
    async saveProfile(p) { db.profiles[ME.id] = { id: ME.id, ...p }; emit(); },
    async getProfileStats(id): Promise<ProfileStats> {
      const rs = db.ratings.filter(r => r.ratee_id === id);
      const past = (rideId: string) => { const r = db.rides.find(x => x.id === rideId); return !!r && new Date(r.depart_at).getTime() < Date.now(); };
      return {
        avg_stars: rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 100) / 100 : null,
        rating_count: rs.length,
        rides_driven: db.rides.filter(r => r.owner_id === id && r.kind === "offer" && new Date(r.depart_at).getTime() < Date.now()).length + (id === "jordan" ? 11 : id === "maya" ? 6 : 0),
        rides_taken: db.requests.filter(q => q.rider_id === id && q.status === "approved" && past(q.ride_id)).length + (id === ME.id ? 2 : 0),
      };
    },
    async listReviews(id) {
      return db.ratings.filter(r => r.ratee_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(r => ({ ...r, rater: owner(r.rater_id) }));
    },

    async listRides() {
      const cutoff = Date.now() - 6 * 36e5;
      return db.rides.filter(r => new Date(r.depart_at).getTime() >= cutoff).sort((a, b) => a.depart_at.localeCompare(b.depart_at)).map(full);
    },
    async getRide(id) { const r = db.rides.find(x => x.id === id); return r ? full(r) : null; },
    async createRide(input: RideInput, contact) {
      const id = uid("r");
      db.rides.push({ ...input, id, owner_id: ME.id });
      db.contacts[id] = contact;
      emit();
      // Someone notices your post a few seconds later.
      later(6000, () => {
        if (!db.rides.some(r => r.id === id)) return;
        const who = input.kind === "offer" ? "aiden" : "jordan";
        db.requests.push({ id: uid("q"), ride_id: id, rider_id: who, status: "pending", message: input.kind === "offer" ? "Hi! Could I grab a seat? Happy to split gas." : "I'm driving that way, want a ride?" });
      });
      return id;
    },
    async deleteRide(id) {
      db.rides = db.rides.filter(r => r.id !== id);
      db.requests = db.requests.filter(q => q.ride_id !== id);
      db.messages = db.messages.filter(m => m.ride_id !== id);
      delete db.contacts[id];
      emit();
    },
    async myTrips(): Promise<Trip[]> {
      const out: Trip[] = [];
      for (const r of db.rides) {
        if (r.owner_id === ME.id) out.push({ ride: full(r), role: r.kind === "offer" ? "driver" : "poster" });
        else if (db.requests.some(q => q.ride_id === r.id && q.rider_id === ME.id && q.status === "approved")) out.push({ ride: full(r), role: "rider" });
      }
      return out;
    },

    async myRequests() { return Object.fromEntries(db.requests.filter(q => q.rider_id === ME.id).map(q => [q.ride_id, q])); },
    async requestsFor(rideId) {
      const r = db.rides.find(x => x.id === rideId);
      if (!r || r.owner_id !== ME.id) return [];
      return db.requests.filter(q => q.ride_id === rideId).map(q => ({ ...q, rider: owner(q.rider_id) }));
    },
    async requestSeat(rideId, message) {
      const id = uid("q");
      db.requests.push({ id, ride_id: rideId, rider_id: ME.id, status: "pending", message: message || null });
      emit();
      later(2500, () => {
        const q = db.requests.find(x => x.id === id);
        if (!q || q.status !== "pending") return;
        q.status = "approved";
        const r = db.rides.find(x => x.id === rideId);
        if (r) db.messages.push({ id: uid("m"), ride_id: rideId, sender_id: r.owner_id, body: "You're in! Welcome aboard 🚗", created_at: new Date().toISOString() });
      });
    },
    async cancelRequest(id) { db.requests = db.requests.filter(q => q.id !== id); emit(); },
    async setRequestStatus(id, status) { const q = db.requests.find(x => x.id === id); if (q) q.status = status; emit(); },
    async getContact(rideId) { return isParticipant(rideId, ME.id) ? db.contacts[rideId] ?? null : null; },

    async participants(rideId): Promise<Participant[]> {
      if (!isParticipant(rideId, ME.id)) return [];
      const r = db.rides.find(x => x.id === rideId)!;
      const ids = [r.owner_id, ...db.requests.filter(q => q.ride_id === rideId && q.status === "approved").map(q => q.rider_id)];
      return ids.map(id => ({ id, display_name: db.profiles[id]?.display_name ?? "Student", college: db.profiles[id]?.college ?? null, is_owner: id === r.owner_id }));
    },
    async listMessages(rideId) {
      if (!isParticipant(rideId, ME.id)) return [];
      return db.messages.filter(m => m.ride_id === rideId).sort((a, b) => a.created_at.localeCompare(b.created_at));
    },
    async sendMessage(rideId, body) {
      db.messages.push({ id: uid("m"), ride_id: rideId, sender_id: ME.id, body, created_at: new Date().toISOString() });
      emit();
      const others = (await this.participants(rideId)).filter(p => p.id !== ME.id);
      if (others.length) later(1800, () => {
        const from = others[Math.floor(Math.random() * others.length)];
        db.messages.push({ id: uid("m"), ride_id: rideId, sender_id: from.id, body: REPLIES[Math.floor(Math.random() * REPLIES.length)], created_at: new Date().toISOString() });
      });
    },

    async ratingsGiven(rideId) { return db.ratings.filter(r => r.ride_id === rideId && r.rater_id === ME.id); },
    async rate(rideId, rateeId, stars, comment) {
      if (db.ratings.some(r => r.ride_id === rideId && r.rater_id === ME.id && r.ratee_id === rateeId)) throw new Error("duplicate");
      db.ratings.push({ id: uid("rt"), ride_id: rideId, rater_id: ME.id, ratee_id: rateeId, stars, comment: comment || null, created_at: new Date().toISOString() });
      emit();
    },

    subscribeBoard(cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
    subscribeRide(_rideId, cb) { listeners.add(cb); return () => { listeners.delete(cb); }; },
  };
}

/** Wipe demo data back to the samples. */
export function resetDemo() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
