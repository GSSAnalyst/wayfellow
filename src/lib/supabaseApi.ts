import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CONFIG } from "./config";
import type { Api, Me, Message, Participant, Profile, ProfileStats, Review, Ride, RideInput, SeatRequest, Trip, TripRole } from "./types";

const RIDE_SELECT = "*, owner:profiles(display_name, college)";

function must<T>({ data, error }: { data: T; error: unknown }): T {
  if (error) throw error;
  return data;
}

export function createSupabaseApi(): Api {
  const sb: SupabaseClient = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, {
    auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  let me: Me | null = null;
  const toMe = (u: { id: string; email?: string } | null | undefined): Me | null =>
    u ? { id: u.id, email: (u.email || "").toLowerCase() } : null;

  async function counts(): Promise<Record<string, number>> {
    const rows = must(await sb.rpc("seat_counts")) as { ride_id: string; taken: number }[] | null;
    return Object.fromEntries((rows || []).map(r => [r.ride_id, Number(r.taken)]));
  }
  const withTaken = (rides: Omit<Ride, "taken">[], c: Record<string, number>): Ride[] =>
    rides.map(r => ({ ...r, taken: c[r.id] || 0 }));

  const api: Api = {
    mode: "live",

    async getSession() {
      const { data } = await sb.auth.getSession();
      me = toMe(data.session?.user);
      return me;
    },
    onAuth(cb) {
      const { data } = sb.auth.onAuthStateChange((evt, session) => {
        if (evt === "SIGNED_IN" || evt === "SIGNED_OUT" || evt === "USER_UPDATED") {
          me = toMe(session?.user);
          cb(me);
        }
      });
      return () => data.subscription.unsubscribe();
    },
    async sendMagicLink(email) {
      const redirect = window.location.origin + window.location.pathname;
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (error) throw error;
    },
    async signOut() { await sb.auth.signOut(); },

    async getProfile(id) {
      return must(await sb.from("profiles").select("id, display_name, college, email_alerts").eq("id", id).maybeSingle()) as Profile | null;
    },
    async saveProfile(p) {
      if (!me) throw new Error("not signed in");
      must(await sb.from("profiles").upsert({ id: me.id, display_name: p.display_name, college: p.college || null, email_alerts: p.email_alerts ?? true }));
    },
    async getProfileStats(id) {
      const rows = must(await sb.rpc("profile_stats", { u: id })) as ProfileStats[] | null;
      const s = rows?.[0];
      return { avg_stars: s?.avg_stars != null ? Number(s.avg_stars) : null, rating_count: Number(s?.rating_count || 0), rides_driven: Number(s?.rides_driven || 0), rides_taken: Number(s?.rides_taken || 0) };
    },
    async listReviews(id) {
      return must(await sb.from("ratings").select("*, rater:profiles!ratings_rater_id_fkey(display_name)").eq("ratee_id", id).order("created_at", { ascending: false }).limit(50)) as Review[];
    },

    async listRides() {
      const since = new Date(Date.now() - 6 * 36e5).toISOString();
      const [rides, c] = await Promise.all([
        sb.from("rides").select(RIDE_SELECT).gte("depart_at", since).order("depart_at").limit(400).then(must),
        counts(),
      ]);
      return withTaken(rides as Omit<Ride, "taken">[], c);
    },
    async getRide(id) {
      const [r, c] = await Promise.all([sb.from("rides").select(RIDE_SELECT).eq("id", id).maybeSingle().then(must), counts()]);
      return r ? withTaken([r as Omit<Ride, "taken">], c)[0] : null;
    },
    async createRide(input: RideInput, contact: string) {
      const row = must(await sb.from("rides").insert(input).select("id").single()) as { id: string };
      must(await sb.from("ride_contacts").insert({ ride_id: row.id, contact }));
      return row.id;
    },
    async deleteRide(id) { must(await sb.from("rides").delete().eq("id", id)); },
    async myTrips() {
      const roles = must(await sb.rpc("my_trips")) as { ride_id: string; role: TripRole }[] | null;
      if (!roles?.length) return [];
      const ids = roles.map(r => r.ride_id);
      const [rides, c] = await Promise.all([sb.from("rides").select(RIDE_SELECT).in("id", ids).then(must), counts()]);
      const byId = new Map(withTaken(rides as Omit<Ride, "taken">[], c).map(r => [r.id, r]));
      return roles.filter(r => byId.has(r.ride_id)).map(r => ({ ride: byId.get(r.ride_id)!, role: r.role })) as Trip[];
    },

    async myRequests() {
      if (!me) return {};
      const rows = must(await sb.from("seat_requests").select("id, ride_id, rider_id, status, message").eq("rider_id", me.id)) as SeatRequest[];
      return Object.fromEntries(rows.map(r => [r.ride_id, r]));
    },
    async requestsFor(rideId) {
      return must(await sb.from("seat_requests").select("id, ride_id, rider_id, status, message, rider:profiles(display_name, college)").eq("ride_id", rideId).order("created_at")) as unknown as SeatRequest[];
    },
    async requestSeat(rideId, message) { must(await sb.from("seat_requests").insert({ ride_id: rideId, message: message || null })); },
    async cancelRequest(id) { must(await sb.from("seat_requests").delete().eq("id", id)); },
    async setRequestStatus(id, status) { must(await sb.from("seat_requests").update({ status }).eq("id", id)); },
    async getContact(rideId) {
      const row = must(await sb.from("ride_contacts").select("contact").eq("ride_id", rideId).maybeSingle()) as { contact: string } | null;
      return row?.contact ?? null;
    },

    async participants(rideId) { return (must(await sb.rpc("ride_participants", { r: rideId })) as Participant[]) || []; },
    async listMessages(rideId) {
      return must(await sb.from("messages").select("*").eq("ride_id", rideId).order("created_at").limit(500)) as Message[];
    },
    async sendMessage(rideId, body) { must(await sb.from("messages").insert({ ride_id: rideId, body })); },

    async ratingsGiven(rideId) {
      if (!me) return [];
      return must(await sb.from("ratings").select("*").eq("ride_id", rideId).eq("rater_id", me.id)) as Review[];
    },
    async rate(rideId, rateeId, stars, comment) {
      must(await sb.from("ratings").insert({ ride_id: rideId, ratee_id: rateeId, stars, comment: comment || null }));
    },

    subscribeBoard(cb) {
      const ch = sb.channel("board-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, cb)
        .on("postgres_changes", { event: "*", schema: "public", table: "seat_requests" }, cb)
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
    subscribeRide(rideId, cb) {
      const ch = sb.channel("ride-" + rideId + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `ride_id=eq.${rideId}` }, cb)
        .on("postgres_changes", { event: "*", schema: "public", table: "seat_requests", filter: `ride_id=eq.${rideId}` }, cb)
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
  };
  return api;
}
