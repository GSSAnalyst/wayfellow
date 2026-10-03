const env = import.meta.env;

export const CONFIG = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined) ?? "",
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "",
  campusDomain: String(env.VITE_CAMPUS_DOMAIN ?? "ucsc.edu").toLowerCase().replace(/^@/, ""),
  campusName: String(env.VITE_CAMPUS_NAME ?? "UCSC"),
  campusCenter: [Number(env.VITE_CAMPUS_LAT ?? 36.9914), Number(env.VITE_CAMPUS_LNG ?? -122.0609)] as [number, number],
};

export const IS_LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);

export const UCSC_COLLEGES = ["Cowell", "Stevenson", "Crown", "Merrill", "Porter", "Kresge", "Oakes", "Rachel Carson", "College Nine", "John R. Lewis", "Graduate Student Commons"];
