"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, EventItem } from "@/lib/types";
import { EventCard } from "./EventCard";
import { Pagination } from "./Pagination";
import { SearchIcon } from "./Icons";

const PAGE_SIZE = 6;

export function ExploreClient({
  events,
  categories,
  initialCategory = "All",
}: {
  events: EventItem[];
  categories: Category[];
  initialCategory?: Category | "All";
}) {
  const [category, setCategory] = useState<Category | "All">(initialCategory);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.area.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.organizer.name.toLowerCase().includes(q) ||
        e.lineup.some((a) => a.name.toLowerCase().includes(q))
      );
    });
  }, [events, category, query]);

  // reset to first page whenever the filter changes
  useEffect(() => setPage(1), [category, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = filtered.slice(start, start + PAGE_SIZE);

  function goToPage(p: number) {
    setPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div>
      <div ref={topRef} className="scroll-mt-24" />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          {(["All", ...categories] as (Category | "All")[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                c === category
                  ? "border-transparent bg-primary text-primary-fg"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64 sm:shrink-0">
          <SearchIcon
            width={17}
            height={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, venues…"
            className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <div className="stagger grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paged.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Pagination page={safePage} pageCount={pageCount} onChange={goToPage} />
              <p className="text-xs text-faint">
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} events
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
          <p className="text-lg font-semibold text-fg">No events match</p>
          <p className="mt-1 text-sm text-muted">Try another vibe or search.</p>
        </div>
      )}
    </div>
  );
}
