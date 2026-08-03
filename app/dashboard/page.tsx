import Link from "next/link";
import type { Metadata } from "next";
import { MY_EVENTS, REVENUE_SERIES, eventRevenue, kpis } from "@/lib/dashboard";
import { EventCover } from "@/components/EventCover";
import { ArrowRightIcon, CalendarIcon, TicketIcon, UsersIcon, WaveIcon } from "@/components/Icons";
import { amount, dateShort, money } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 30 - ((v - min) / (max - min || 1)) * 26 - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `M0,32 L${pts.map(([x, y]) => `${x},${y}`).join(" L")} L100,32 Z`;
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-16 w-full">
      <path d={area} fill="var(--accent)" fillOpacity="0.1" />
      <polyline points={line} fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function DashboardOverview() {
  const k = kpis();
  const cards = [
    { label: "Gross revenue", value: money(k.revenue), delta: "+14%", icon: TicketIcon },
    { label: "Tickets sold", value: k.sold.toLocaleString(), delta: "+8%", icon: UsersIcon },
    { label: "Live events", value: String(k.live), delta: "On sale", icon: CalendarIcon },
    { label: "Avg. fill rate", value: `${k.fill}%`, delta: "+5pts", icon: WaveIcon },
  ];

  return (
    <div className="py-7">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-accent">
                <c.icon width={16} height={16} />
              </span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">
                {c.delta}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-fg">{c.value}</p>
            <p className="text-sm text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue trend */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-fg">Revenue</h2>
            <p className="text-sm text-muted">Last 8 weeks</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-fg">{money(k.revenue)}</p>
            <p className="text-xs font-medium text-success">▲ 14% vs prior</p>
          </div>
        </div>
        <div className="mt-4">
          <Sparkline data={REVENUE_SERIES} />
        </div>
      </div>

      {/* Events table */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">Your events</h2>
          <Link href="/dashboard/audience" className="flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            View audience <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
          <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-4 border-b border-line bg-surface-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-faint sm:grid">
            <span>Event</span>
            <span>Sold</span>
            <span>Revenue</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-line">
            {MY_EVENTS.map((e) => {
              const pct = Math.round((e.attending / e.capacity) * 100);
              return (
                <div key={e.id} className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0">
                      <EventCover src={e.image} alt={e.title} accent={e.accent} className="h-full w-full" rounded="rounded-lg" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-fg">{e.title}</p>
                      <p className="text-xs text-muted">{dateShort(e.date)} · {e.city}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm sm:block">
                      <span className="tnum font-medium text-fg">
                        {e.attending.toLocaleString()}
                        <span className="text-faint"> / {e.capacity.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="tnum font-semibold text-fg">{amount(eventRevenue(e))}</div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    <Link href={`/events/${e.slug}`} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-surface-hover">
                      View
                    </Link>
                    <Link href="/dashboard/audience" className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:bg-surface-hover">
                      Attendees
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
