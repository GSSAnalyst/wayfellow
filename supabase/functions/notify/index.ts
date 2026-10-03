// Supabase Edge Function: sends email alerts for seat requests and decisions.
// Triggered by a Database Webhook on the seat_requests table (insert + update).
// Secrets required (supabase secrets set ...):
//   RESEND_API_KEY   API key from resend.com
//   FROM_EMAIL       e.g. "Wayfellow <rides@yourdomain.com>" (a domain verified in Resend)
//   SITE_URL         e.g. "https://<username>.github.io/wayfellow/"
//   WEBHOOK_SECRET   any long random string; also set as a header on the webhook
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from "npm:@supabase/supabase-js@2";

type SeatRequest = { id: string; ride_id: string; rider_id: string; status: string; message: string | null };
type Payload = { type: "INSERT" | "UPDATE" | "DELETE"; table: string; record: SeatRequest | null; old_record: SeatRequest | null };

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE = (Deno.env.get("SITE_URL") ?? "").replace(/\/?$/, "/");

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

async function person(id: string) {
  const [{ data: p }, { data: u }] = await Promise.all([
    admin.from("profiles").select("display_name, email_alerts").eq("id", id).maybeSingle(),
    admin.auth.admin.getUserById(id),
  ]);
  return { name: p?.display_name ?? "A student", alerts: p?.email_alerts ?? true, email: u?.user?.email ?? null };
}

async function send(to: string, subject: string, heading: string, body: string, rideId: string) {
  const link = `${SITE}#/ride/${rideId}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;padding:24px;color:#121B33">
    <h2 style="margin:0 0 12px">${esc(heading)}</h2>
    <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${body}</p>
    <a href="${link}" style="display:inline-block;background:#0A8E98;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Open the ride</a>
    <p style="font-size:13px;color:#56627F;margin-top:24px">You can turn off email alerts on your Wayfellow profile.</p></div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("FROM_EMAIL"), to, subject, html }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) return new Response("forbidden", { status: 403 });
  const p = (await req.json()) as Payload;
  const r = p.record;
  if (p.table !== "seat_requests" || !r) return new Response("ignored");

  const { data: ride } = await admin.from("rides").select("id, owner_id, kind, origin, destination").eq("id", r.ride_id).maybeSingle();
  if (!ride) return new Response("no ride");
  const route = `${esc(ride.origin)} → ${esc(ride.destination)}`;

  if (p.type === "INSERT") {
    const [owner, rider] = await Promise.all([person(ride.owner_id), person(r.rider_id)]);
    if (owner.email && owner.alerts) {
      const what = ride.kind === "offer" ? "requested a seat" : "offered to drive you";
      const msg = r.message ? `<br><br>“${esc(r.message)}”` : "";
      await send(owner.email, `${rider.name} ${what}`, `${rider.name} ${what}`, `On your ride ${route}.${msg}`, ride.id);
    }
  } else if (p.type === "UPDATE" && p.old_record?.status !== r.status && r.status !== "pending") {
    const [owner, rider] = await Promise.all([person(ride.owner_id), person(r.rider_id)]);
    if (rider.email && rider.alerts) {
      if (r.status === "approved")
        await send(rider.email, "You're in!", "You're in!", `${esc(owner.name)} approved you for ${route}. Their contact details and the ride chat are unlocked.`, ride.id);
      else
        await send(rider.email, "Update on your ride request", "Not this time", `${esc(owner.name)} couldn't fit you on ${route}. Check the board for other rides.`, ride.id);
    }
  }
  return new Response("ok");
});
