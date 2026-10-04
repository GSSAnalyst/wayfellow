import { useEffect, useState } from "react";

/**
 * A student's school is the root .edu domain of their email: jo@cats.ucsc.edu -> ucsc.edu.
 * Same rule as public.school_of() in supabase/schema.sql.
 */
export function schoolOf(email: string): string | null {
  const m = email.trim().toLowerCase().match(/@(?:[a-z0-9-]+\.)*([a-z0-9-]+\.edu)$/);
  return m ? m[1] : null;
}

// US school names by domain, from the Hipo university-domains-list (public/schools.json). Loaded once, on first use.
let names: Record<string, string> | null = null;
let loading: Promise<Record<string, string>> | null = null;

function loadNames() {
  loading ??= fetch(import.meta.env.BASE_URL + "schools.json")
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({}))
    .then((j: Record<string, string>) => (names = j));
  return loading;
}

/** School name for a domain, or the domain itself until the list loads or if the school isn't in it. */
export function useSchoolName(domain: string | null | undefined): string | null {
  const [, bump] = useState(0);
  useEffect(() => { if (domain && !names) loadNames().then(() => bump(n => n + 1)); }, [domain]);
  if (!domain) return null;
  return names?.[domain] ?? domain;
}

export function SchoolName({ domain }: { domain: string | null | undefined }) {
  return <>{useSchoolName(domain)}</>;
}
