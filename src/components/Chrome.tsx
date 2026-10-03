import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink } from "react-router-dom";
import { useApp } from "../lib/app";
import { CONFIG, UCSC_COLLEGES } from "../lib/config";
import { resetDemo } from "../lib/demoApi";
import { Avatar, Dialog } from "./Bits";
import { IconMail, Logo } from "./Icons";

export function Header() {
  const { me, profile, ready, setSignInOpen, setProfileOpen } = useApp();
  const name = profile?.display_name || "Set up profile";
  return (
    <header className="bar">
      <div className="wrap">
        <Link className="brand" to="/" aria-label="Wayfellow home"><Logo /> Wayfellow <span className="campus-tag">{CONFIG.campusName}</span></Link>
        <nav aria-label="Main">
          <NavLink className="nav-link" to="/" end>Board</NavLink>
          <NavLink className="nav-link" to="/match">Smart match</NavLink>
          {me && <NavLink className="nav-link" to="/trips">My trips</NavLink>}
          {ready && !me && <button className="btn btn-hud btn-sm" onClick={() => setSignInOpen(true)}>Sign in</button>}
          {me && (
            <button className="me-chip" onClick={() => setProfileOpen(true)} aria-label="Your profile">
              <Avatar name={name} id={me.id} size={30} /><span>{name}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function MobileNav() {
  const { me } = useApp();
  return (
    <nav className="tabbar" aria-label="Sections">
      <NavLink to="/" end>Board</NavLink>
      <NavLink to="/match">Match</NavLink>
      <NavLink to="/post" className="tab-post">Post</NavLink>
      {me ? <NavLink to="/trips">Trips</NavLink> : <span />}
    </nav>
  );
}

export function Toast() {
  const { toastMsg } = useApp();
  return <div className={"toast" + (toastMsg ? " show" : "")} role="status">{toastMsg}</div>;
}

export function DemoBanner() {
  const { api } = useApp();
  if (api.mode !== "demo") return null;
  return (
    <div className="wrap">
      <div className="banner">
        <p><b>Demo mode.</b> Sample students and rides, saved only in this browser. Other "students" reply automatically so you can try chat, approvals, and ratings. Add your Supabase keys to <code>.env.local</code> to go live.</p>
        <button className="btn btn-line btn-sm" onClick={() => { resetDemo(); window.location.reload(); }}>Reset demo</button>
      </div>
    </div>
  );
}

export function SignInDialog() {
  const { api, signInOpen, setSignInOpen } = useApp();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (signInOpen) { setErr(""); setSent(false); } }, [signInOpen]);
  const domain = CONFIG.campusDomain;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+$/.test(v)) return setErr("Enter your full email address.");
    if (!v.endsWith("@" + domain)) return setErr(`Use your @${domain} email. This board is for ${CONFIG.campusName} students only.`);
    setBusy(true); setErr("");
    try { await api.sendMagicLink(v); setSent(true); }
    catch (ex) { setErr(/rate|seconds/i.test(String((ex as Error)?.message)) ? "Too many tries. Wait a minute, then send another link." : "Couldn't send the link. Check the address and try again."); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={signInOpen} onClose={() => setSignInOpen(false)} title="Sign in" narrow>
      {sent ? (
        <div className="sent"><IconMail size={52} /><h3>Check your inbox</h3><p>We sent a sign-in link to {email.trim()}. Open it on this device to finish.</p></div>
      ) : (
        <form onSubmit={submit} className="form-grid" noValidate>
          <p className="lead">We'll email a one-time link to your @{domain} address. No password needed.</p>
          <div className="field full"><label htmlFor="sEmail">Campus email</label><input id="sEmail" type="email" autoComplete="email" placeholder={`you@${domain}`} value={email} onChange={e => setEmail(e.target.value)} autoFocus /></div>
          {err && <p className="err">{err}</p>}
          <div className="form-actions full"><button type="button" className="btn btn-line" onClick={() => setSignInOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>Email me a sign-in link</button></div>
        </form>
      )}
    </Dialog>
  );
}

export function ProfileDialog() {
  const { api, me, profile, profileOpen, setProfileOpen, reloadProfile, toast } = useApp();
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (profileOpen) { setName(profile?.display_name ?? ""); setCollege(profile?.college ?? ""); setAlerts(profile?.email_alerts ?? true); setErr(""); }
  }, [profileOpen, profile]);
  const first = !profile;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setErr("Add the name drivers and riders will see.");
    setBusy(true);
    try { await api.saveProfile({ display_name: name.trim(), college: college.trim() || null, email_alerts: alerts }); await reloadProfile(); setProfileOpen(false); toast("Profile saved"); }
    catch { setErr("Couldn't save your profile. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} title={first ? "Set up your profile" : "Your profile"} narrow>
      <form onSubmit={submit} className="form-grid" noValidate>
        <p className="lead">Drivers and riders see this on requests and in chat.</p>
        <div className="field full"><label htmlFor="pName">Name</label><input id="pName" maxLength={40} autoComplete="given-name" placeholder="First name is fine" value={name} onChange={e => setName(e.target.value)} /></div>
        <div className="field full">
          <label htmlFor="pCollege">College or dorm</label>
          <input id="pCollege" maxLength={60} list="colleges" placeholder="Optional" value={college} onChange={e => setCollege(e.target.value)} />
          {CONFIG.campusDomain === "ucsc.edu" && <datalist id="colleges">{UCSC_COLLEGES.map(c => <option key={c} value={c} />)}</datalist>}
        </div>
        <label className="check full"><input type="checkbox" checked={alerts} onChange={e => setAlerts(e.target.checked)} /> Email me about seat requests and approvals</label>
        {err && <p className="err">{err}</p>}
        <div className="form-actions full">
          {me && !first && <Link className="text-btn left" to={`/u/${me.id}`} onClick={() => setProfileOpen(false)}>View public profile</Link>}
          {me && api.mode === "live" && !first && <button type="button" className="text-btn danger" onClick={async () => { setProfileOpen(false); await api.signOut(); toast("Signed out"); }}>Sign out</button>}
          <button className="btn btn-primary" disabled={busy}>Save profile</button>
        </div>
      </form>
    </Dialog>
  );
}
