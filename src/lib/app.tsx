import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadArea, saveArea, type Area } from "./area";
import { IS_LIVE } from "./config";
import { createDemoApi } from "./demoApi";
import { createSupabaseApi } from "./supabaseApi";
import type { Api, Me, Profile } from "./types";

interface AppState {
  api: Api;
  me: Me | null;
  profile: Profile | null;
  ready: boolean;
  reloadProfile: () => Promise<void>;
  toast: (msg: string) => void;
  toastMsg: string | null;
  needsProfile: boolean;
  signInOpen: boolean;
  setSignInOpen: (v: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
  /** Where this student is based; remembered in this browser. */
  area: Area | null;
  setArea: (a: Area | null) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => (IS_LIVE ? createSupabaseApi() : createDemoApi()), []);
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [area, setAreaState] = useState<Area | null>(loadArea);
  const setArea = useCallback((a: Area | null) => { saveArea(a); setAreaState(a); }, []);
  const timer = useRef<number>();

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const loadFor = useCallback(async (m: Me | null) => {
    setMe(m);
    if (!m) { setProfile(null); return; }
    try { setProfile(await api.getProfile(m.id)); } catch { setProfile(null); }
  }, [api]);

  useEffect(() => {
    let alive = true;
    api.getSession().then(async m => { if (alive) { await loadFor(m); setReady(true); } });
    const off = api.onAuth(m => { loadFor(m); });
    return () => { alive = false; off(); };
  }, [api, loadFor]);

  const reloadProfile = useCallback(async () => { if (me) setProfile(await api.getProfile(me.id)); }, [api, me]);
  const needsProfile = ready && !!me && !profile;

  useEffect(() => { if (needsProfile) setProfileOpen(true); }, [needsProfile]);

  const value: AppState = { api, me, profile, ready, reloadProfile, toast, toastMsg, needsProfile, signInOpen, setSignInOpen, profileOpen, setProfileOpen, area, setArea };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

/** Returns a function that runs `fn` only if the user is signed in with a profile; otherwise opens the right dialog. */
export function useRequireUser() {
  const { me, profile, ready, setSignInOpen, setProfileOpen, toast } = useApp();
  return (fn: () => void) => {
    if (!ready) return toast("One sec, still loading.");
    if (!me) return setSignInOpen(true);
    if (!profile) return setProfileOpen(true);
    fn();
  };
}

/** Load async data and reload it on demand. */
export function useLoader<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const n = ++seq.current;
    try { const d = await load(); if (n === seq.current) { setData(d); setError(null); } }
    catch (e) { if (n === seq.current) { console.error(e); setError(e); } }
    finally { if (n === seq.current) setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { setLoading(true); reload(); }, [reload]);
  return { data, error, loading, reload };
}
