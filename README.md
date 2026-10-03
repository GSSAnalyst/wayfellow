# Wayfellow — campus ride board

A ride-sharing app for students who live on campus. Drivers post trips, riders request seats, drivers approve, and the car gets a private chat. Everyone splits the gas, and people rate each other after the ride.

Built with **React + TypeScript + Vite**, **Supabase** (database, sign-in, live updates, email alerts), and **Leaflet + OpenStreetMap** for maps.

## Features

| | |
|---|---|
| **Campus-only sign-in** | One-time email link, limited to your campus domain. Enforced by the database, not just the page. |
| **Map routes** | Pick places by search or by dropping a pin. The driving route is drawn on a map and the distance fills itself in. The board has a map view of every ride. |
| **Seat requests** | Riders send a request with a message; drivers approve or decline. |
| **Private ride chat** | Live chat for the driver and approved riders only. |
| **Ratings and history** | After a ride, everyone in the car can rate each other. Profiles show stars, reviews, and rides driven/taken. "My trips" shows upcoming rides and your history. |
| **Email alerts** | Drivers get an email for new requests; riders get one when they're approved or declined. Can be turned off per profile. |
| **Smart match** | Enter where you're headed and roughly when. It finds drivers going *near* there (within 30 miles), even if they typed the place differently. |
| **Impact stats** | CO₂ saved and gas money saved, per ride and across your trips. |
| **Extras** | Add a ride to your calendar (.ics), share a ride link, live board updates, light and dark themes, phone-friendly tab bar. |

## Try it locally (demo mode)

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Open the link it prints (usually http://localhost:5173). With no Supabase keys, the app runs in **demo mode**: sample students and rides, saved in your browser. Other "students" approve your requests and reply in chat automatically, so you can try every feature. Use **Reset demo** on the home page to start over.

## Project structure

```
src/
  App.tsx                 routes and app shell
  main.tsx                entry point
  lib/
    types.ts              data types and the Api interface every backend implements
    supabaseApi.ts        live backend (Supabase)
    demoApi.ts            demo backend (browser storage, sample data)
    app.tsx               shared state: signed-in user, profile, dialogs, toasts
    geo.ts                place search, driving routes, distances
    format.ts             money, dates, gas split, CO₂ math
    config.ts             reads settings from .env
  components/             RideCard, RideMap, PlacePicker, HeroRoad, GasCalculator, dialogs, icons
  pages/                  Home, PostRide, RideDetail, Match, MyTrips, ProfilePage
  styles/global.css       design tokens and all styles
supabase/
  schema.sql              tables, security rules, helper functions, realtime
  functions/notify/       email alert function (Resend)
.github/workflows/deploy.yml   builds and publishes to GitHub Pages
```

## Go live

### 1. Database (Supabase)
1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. It's safe to run again after updates. If your campus email isn't `@ucsc.edu`, change it in `is_campus()` first.
3. **Authentication → URL Configuration**: set **Site URL** to your GitHub Pages address (e.g. `https://<username>.github.io/wayfellow/`) and add it, plus `http://localhost:5173`, under **Redirect URLs**.
4. Supabase's built-in email sender is limited to a few emails an hour. Before inviting students, add your own SMTP under **Authentication → Emails → SMTP Settings** (Resend works for this too).

### 2. Connect the app
Copy `.env.example` to `.env.local` and fill in your **Project URL** and **anon public key** (Project Settings → API). Restart `npm run dev`.

The anon key is meant to be public; the row level security rules in `schema.sql` decide what it can do. Never put the **service_role** key in the app.

### 3. Email alerts (optional)
1. Create a free account at [resend.com](https://resend.com), verify a sending domain, and create an API key.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from this folder:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy notify --no-verify-jwt
   supabase secrets set RESEND_API_KEY=... FROM_EMAIL="Wayfellow <rides@yourdomain.com>" SITE_URL=https://<username>.github.io/wayfellow/ WEBHOOK_SECRET=<long random string>
   ```
3. In the dashboard, **Database → Webhooks → Create**: table `seat_requests`, events **Insert** and **Update**, type **Supabase Edge Functions**, function `notify`, and add an HTTP header `x-webhook-secret` with the same secret.

### 4. Publish on GitHub Pages
1. Push this folder to a GitHub repo (VS Code: Source Control → Publish to GitHub).
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (and optionally `VITE_CAMPUS_DOMAIN`, `VITE_CAMPUS_NAME`, `VITE_CAMPUS_LAT`, `VITE_CAMPUS_LNG`).
4. Every push to `main` builds and publishes the site. Watch progress under the **Actions** tab.

## Privacy and security

- Sign-in is a one-time email link; only campus addresses are accepted, checked in the page and by the database.
- Row level security: rides are visible to signed-in campus accounts only; contact details and chat only to the driver and approved riders; ratings only from people who shared a finished ride.
- HTTPS everywhere, and Supabase encrypts data at rest.
- Old rides drop off the board; deleting a ride deletes its requests, chat, and contact details.

## Maps and fair use

Place search uses OpenStreetMap's Nominatim, routes use the public OSRM demo server, and map tiles come from OpenStreetMap. These are free community services meant for light use. If the app gets popular, switch to a hosted provider (MapTiler, Stadia Maps, or Mapbox) by changing `src/lib/geo.ts` and the tile URL in `src/components/RideMap.tsx`.

## Working on it with Claude Code

Open this folder in VS Code and ask Claude Code for changes, for example:
- "Add a 'Report this post' button on the ride page that saves to a reports table."
- "Let drivers edit a ride after posting."
- "Add push notifications for new chat messages."
# wayfellow
