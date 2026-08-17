"use client";

import { useEffect, useState } from "react";

/**
 * Sri Lanka's fixed offset. Event datetimes arrive timezone-naive and are
 * Colombo wall-clock (BE DECISIONS.md 2026-07-23, "stored UTC-verbatim"), so
 * `new Date(iso)` would read them in the *viewer's* zone — a countdown that is
 * hours out for anyone abroad. LK has had no DST since 2006, so a fixed offset
 * is exact rather than an approximation. Revisit alongside the BE's own
 * "true Asia/Colombo instants" note if events outside LK ever land.
 */
const COLOMBO_OFFSET = "+05:30";

/** Instant an event starts, from its naive Colombo date string. */
export function startInstant(iso: string): number {
  return new Date(`${iso}${COLOMBO_OFFSET}`).getTime();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "3d 4h" / "6h 12m" / "14m" — coarse far out, precise as it closes in. */
function label(ms: number): string {
  if (ms < MINUTE) return "Starting now";
  if (ms < HOUR) return `in ${Math.floor(ms / MINUTE)}m`;
  if (ms < DAY) {
    const h = Math.floor(ms / HOUR);
    const m = Math.floor((ms % HOUR) / MINUTE);
    return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
  }
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  if (d >= 7) return `in ${d}d`;
  return h > 0 ? `in ${d}d ${h}h` : `in ${d}d`;
}

/**
 * Live countdown to an event's doors.
 *
 * Renders nothing until mounted: the server and the browser tick different
 * clocks, so anything time-derived in the first paint is a hydration mismatch
 * waiting to happen.
 */
export function Countdown({
  date,
  className = "",
}: {
  date: string;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    // Once a minute is enough for every bucket above — the finest unit shown
    // is minutes, so a per-second timer would repaint identical text 59 times.
    const id = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const remaining = startInstant(date) - now;
  // Under way or finished: the card's own ended/sales state says it better
  // than a negative countdown would.
  if (remaining <= 0) return null;

  return (
    <span
      className={`rounded-full bg-black/45 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${className}`}
    >
      {label(remaining)}
    </span>
  );
}
