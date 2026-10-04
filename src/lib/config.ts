import type { LatLng } from "./types";

const env = import.meta.env;

export const CONFIG = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
};

/** VITE_DEMO=1 (see .env.demo) forces demo mode even when Supabase keys are set, for a shareable preview. */
export const IS_LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) && env.VITE_DEMO !== "1";

/** Map view before a student sets their area: the whole continental US. */
export const US_CENTER: LatLng = [39.5, -98.35];
export const US_ZOOM = 4;
