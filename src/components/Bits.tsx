import { useEffect, useRef, type ReactNode } from "react";
import { hue } from "../lib/format";
import { IconStar } from "./Icons";

export function Avatar({ name, id, size = 32 }: { name: string; id: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: `hsl(${hue(id || name)} 70% 72%)` }} aria-hidden="true">
      {(name || "?").trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Stars({ value, size = 16 }: { value: number | null; size?: number }) {
  const v = value ?? 0;
  return (
    <span className="stars" aria-label={value == null ? "No ratings yet" : `${v.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(i => <IconStar key={i} size={size} filled={v >= i - 0.25} className={v >= i - 0.25 ? "on" : ""} />)}
    </span>
  );
}

export function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="star-input" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? "s" : ""}`} className={value >= i ? "on" : ""} onClick={() => onChange(i)}>
          <IconStar size={26} filled={value >= i} />
        </button>
      ))}
    </div>
  );
}

export function Dialog({ open, onClose, title, children, footer, narrow }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; narrow?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className={narrow ? "narrow" : ""} onClose={onClose} onClick={e => { if (e.target === ref.current) onClose(); }} aria-label={title}>
      {open && (
        <>
          <div className="dh"><h2>{title}</h2><button type="button" className="x" onClick={onClose} aria-label="Close">×</button></div>
          <div className="dbody">{children}</div>
          {footer && <div className="dfoot">{footer}</div>}
        </>
      )}
    </dialog>
  );
}

export function Skeletons({ n = 3 }: { n?: number }) {
  return <>{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" />)}</>;
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}
