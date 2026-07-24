"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ATTENDEES, MY_EVENTS, audienceStats, type AttendeeStatus } from "@/lib/dashboard";
import { Avatar } from "@/components/Avatar";
import { Pagination } from "@/components/Pagination";
import { CheckIcon, MailIcon, SearchIcon, UsersIcon } from "@/components/Icons";
import { amount } from "@/lib/format";

const SEGMENTS = ["All", "Confirmed", "Checked in", "Refunded", "Repeat"] as const;
type Segment = (typeof SEGMENTS)[number];
const PAGE_SIZE = 8;

const statusStyle: Record<AttendeeStatus, string> = {
  Confirmed: "bg-accent-soft text-accent",
  "Checked in": "bg-success-soft text-success",
  Refunded: "bg-danger-soft text-danger",
};

export default function AudiencePage() {
  const [segment, setSegment] = useState<Segment>("All");
  const [eventSlug, setEventSlug] = useState("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);
  const stats = audienceStats();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ATTENDEES.filter((a) => {
      if (eventSlug !== "All" && a.eventSlug !== eventSlug) return false;
      if (segment === "Confirmed" && a.status !== "Confirmed") return false;
      if (segment === "Checked in" && a.status !== "Checked in") return false;
      if (segment === "Refunded" && a.status !== "Refunded") return false;
      if (segment === "Repeat" && !a.repeat) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    });
  }, [segment, eventSlug, query]);

  useEffect(() => setPage(1), [segment, eventSlug, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = rows.slice(start, start + PAGE_SIZE);

  function goToPage(p: number) {
    setPage(p);
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const statCards = [
    { label: "Total attendees", value: stats.total.toLocaleString() },
    { label: "Tickets issued", value: stats.tickets.toLocaleString() },
    { label: "New this week", value: `+${stats.newThisWeek}` },
    { label: "Repeat buyers", value: stats.repeat.toLocaleString() },
  ];

  return (
    <div className="py-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Audience</h1>
        <p className="mt-1 text-muted">Everyone who&rsquo;s bought or RSVP&rsquo;d across your events.</p>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <p className="text-2xl font-bold tracking-tight text-fg">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* controls */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              onClick={() => setSegment(s)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                s === segment
                  ? "border-transparent bg-primary text-primary-fg"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={eventSlug}
            onChange={(e) => setEventSlug(e.target.value)}
            className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-fg focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="All">All events</option>
            {MY_EVENTS.map((e) => (
              <option key={e.slug} value={e.slug}>{e.title}</option>
            ))}
          </select>
          <div className="relative flex-1 lg:w-56">
            <SearchIcon width={17} height={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>
      </div>

      {/* table */}
      <div
        ref={tableRef}
        className="mt-4 scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]"
      >
        <div className="hidden grid-cols-[1.6fr_1.4fr_1fr_0.8fr_auto] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint md:grid">
          <span>Attendee</span>
          <span>Event</span>
          <span>Ticket</span>
          <span>Spend</span>
          <span className="text-right">Status</span>
        </div>

        {rows.length === 0 ? (
          <div className="grid place-items-center py-16 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-muted">
              <UsersIcon width={20} height={20} />
            </span>
            <p className="mt-3 font-semibold text-fg">No attendees match</p>
            <p className="text-sm text-muted">Try a different segment or search.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {paged.map((a) => (
              <div key={a.id} className="grid grid-cols-1 gap-3 px-5 py-3.5 md:grid-cols-[1.6fr_1.4fr_1fr_0.8fr_auto] md:items-center">
                <div className="flex items-center gap-3">
                  <Avatar name={a.name} size={36} ring={false} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium text-fg">
                      {a.name}
                      {a.repeat && (
                        <span className="rounded-full bg-secondary-soft px-1.5 py-0.5 text-[10px] font-semibold text-secondary">
                          Repeat
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted">{a.email}</p>
                  </div>
                </div>

                <div className="truncate text-sm text-muted">{a.eventTitle}</div>

                <div className="text-sm text-muted">
                  {a.tier} <span className="text-faint">× {a.qty}</span>
                </div>

                <div className="tnum text-sm font-semibold text-fg">{amount(a.amount)}</div>

                <div className="flex items-center justify-between gap-2 md:justify-end">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle[a.status]}`}>
                    {a.status}
                  </span>
                  <div className="flex gap-1">
                    <button aria-label="Message" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-hover hover:text-fg">
                      <MailIcon width={15} height={15} />
                    </button>
                    <button aria-label="Check in" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:bg-surface-hover hover:text-fg">
                      <CheckIcon width={15} height={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <Pagination page={safePage} pageCount={pageCount} onChange={goToPage} />
          <p className="text-xs text-faint">
            Showing {start + 1}–{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}.
            Export, messaging and check-in are illustrative in this demo.
          </p>
        </div>
      )}
    </div>
  );
}
