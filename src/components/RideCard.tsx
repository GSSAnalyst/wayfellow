import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTilt } from "../lib/motion";
import { CATEGORY_LABEL, num, priceText, relText, seatPrice, whenText } from "../lib/format";
import { SchoolName } from "../lib/schools";
import type { Ride, SeatRequest } from "../lib/types";
import { Avatar } from "./Bits";
import { CategoryIcon } from "./Icons";

const STATUS_TEXT = { pending: "Request sent", approved: "You're in", declined: "Not this time" } as const;

export function SeatBar({ seats, taken }: { seats: number; taken: number }) {
  return (
    <div className="seatbar" aria-label={`${taken} of ${seats} seats taken`}>
      {Array.from({ length: seats }, (_, i) => <i key={i} className={i < taken ? "on" : ""} />)}
      <span>{taken >= seats ? "Full" : `${seats - taken} open`}</span>
    </div>
  );
}

export function RideCard({ ride, meId, myReq, badge, highlight, onHover, index = 0 }: {
  ride: Ride;
  meId?: string | null;
  myReq?: SeatRequest;
  badge?: string;
  highlight?: boolean;
  onHover?: (id: string | null) => void;
  /** Position in the list, for the staggered entrance. */
  index?: number;
}) {
  const tilt = useTilt<HTMLAnchorElement>();
  const offer = ride.kind === "offer";
  const mine = !!meId && ride.owner_id === meId;
  const seats = num(ride.seats) || 1;
  const price = seatPrice(ride);
  const ownerName = mine ? "You" : ride.owner?.display_name || "A student";

  return (
    <Link
      ref={tilt}
      to={`/ride/${ride.id}`}
      className={"card tilt" + (mine ? " mine" : "") + (highlight ? " hl" : "")}
      style={{ "--i": Math.min(index, 12) } as CSSProperties}
      onMouseEnter={() => onHover?.(ride.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(ride.id)}
      onBlur={() => onHover?.(null)}
    >
      <div className="card-top">
        <CategoryIcon category={ride.category} size={16} />
        {CATEGORY_LABEL[ride.category] ?? "Trip"}
        {mine ? <span className="pill you">Your post</span> : <span className={"pill " + ride.kind}>{offer ? "Driving" : "Needs a ride"}</span>}
      </div>
      {badge && <div className="match-badge">{badge}</div>}
      <div className="route">
        <div className="from">{ride.origin}</div>
        <div className="line">{ride.miles ? `${Math.round(num(ride.miles))} miles` : "to"}</div>
        <div className="to">{ride.destination}</div>
      </div>
      <div className="when"><b>{whenText(ride.depart_at)}</b><span>{relText(ride.depart_at)}</span></div>
      <div className="stats">
        {offer ? (
          <>
            <div className="price"><b>{priceText(price)}</b><span>{price ? "per seat" : price === 0 ? "no charge" : "for the price"}</span></div>
            <SeatBar seats={seats} taken={ride.taken} />
          </>
        ) : (
          <>
            <div className="price"><b>{seats} {seats === 1 ? "seat" : "seats"}</b><span>needed</span></div>
            {ride.taken > 0 && <div className="seatbar"><span>Driver found</span></div>}
          </>
        )}
      </div>
      <div className="foot">
        <div className="driver">
          <Avatar name={ownerName} id={ride.owner_id} size={28} />
          <div><b>{ownerName}</b><small>{ride.owner?.school ? <SchoolName domain={ride.owner.school} /> : ride.owner?.college || (offer ? "Driver" : "Rider")}</small></div>
        </div>
        {myReq ? <span className={"status " + myReq.status}>{STATUS_TEXT[myReq.status]}</span> : <span className="go">View ride →</span>}
      </div>
    </Link>
  );
}
