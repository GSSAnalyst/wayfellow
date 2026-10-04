import { useParams } from "react-router-dom";
import { useApp, useLoader } from "../lib/app";
import { SchoolName } from "../lib/schools";
import { Avatar, Empty, Stars } from "../components/Bits";

export function ProfilePage() {
  const { id = "" } = useParams();
  const { api, me, setProfileOpen } = useApp();
  const profile = useLoader(() => api.getProfile(id), [api, id]);
  const stats = useLoader(() => api.getProfileStats(id), [api, id]);
  const reviews = useLoader(() => api.listReviews(id), [api, id]);
  const p = profile.data;

  if (profile.loading && !p) return <div className="wrap page"><div className="skeleton tall" /></div>;
  if (!p) return <div className="wrap page"><Empty title="Profile not found" /></div>;
  const s = stats.data;
  const isMe = me?.id === id;

  return (
    <div className="wrap page narrow-page">
      <div className="profile-head panel">
        <Avatar name={p.display_name} id={p.id} size={84} />
        <div>
          <h1 className="page-title">{p.display_name}{isMe && <span className="pill you">You</span>}</h1>
          {(p.school || p.college) && <p className="sub">{p.school && <SchoolName domain={p.school} />}{p.school && p.college && " · "}{p.college}</p>}
          <div className="owner-rating big"><Stars value={s?.avg_stars ?? null} size={20} /> {s?.rating_count ? `${s.avg_stars?.toFixed(1)} from ${s.rating_count} ${s.rating_count === 1 ? "review" : "reviews"}` : "No reviews yet"}</div>
        </div>
        {isMe && <button className="btn btn-line btn-sm" onClick={() => setProfileOpen(true)}>Edit profile</button>}
      </div>
      <div className="impact three">
        <div><b>{s?.rides_driven ?? "—"}</b><span>rides driven</span></div>
        <div><b>{s?.rides_taken ?? "—"}</b><span>rides taken</span></div>
        <div><b>{s?.rating_count ?? "—"}</b><span>reviews</span></div>
      </div>
      <h2 className="section-sm">Reviews</h2>
      {reviews.data && reviews.data.length ? (
        <div className="reviews">
          {reviews.data.map(r => (
            <div key={r.id} className="review panel">
              <div className="review-top"><Stars value={r.stars} size={15} /><span className="muted">{new Date(r.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span></div>
              {r.comment && <p>{r.comment}</p>}
              <small>— {r.rater?.display_name ?? "A student"}</small>
            </div>
          ))}
        </div>
      ) : <p className="muted">Reviews show up here after shared rides.</p>}
    </div>
  );
}
