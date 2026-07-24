"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EVENTS, trendingEvents } from "@/lib/data";
import { ARTISTS } from "@/lib/artists";
import { Avatar } from "./Avatar";
import { EventCover } from "./EventCover";
import { CalendarIcon, CheckCircleIcon, SearchIcon, XIcon } from "./Icons";
import { dateShort } from "@/lib/format";

const norm = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

export function NavSearch({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean | ((o: boolean) => boolean)) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(id);
    }
  }, [open]);

  // click outside closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  const { artists, events, popular } = useMemo(() => {
    const s = norm(q.trim());
    if (!s) {
      return { artists: ARTISTS.slice(0, 3), events: trendingEvents(3), popular: true };
    }
    const artists = ARTISTS.filter(
      (a) => norm(a.name).includes(s) || norm(a.role).includes(s)
    ).slice(0, 4);
    const events = EVENTS.filter(
      (e) =>
        norm(e.title).includes(s) ||
        norm(e.venue).includes(s) ||
        norm(e.area).includes(s) ||
        norm(e.category).includes(s) ||
        e.lineup.some((p) => norm(p.name).includes(s))
    ).slice(0, 5);
    return { artists, events, popular: false };
  }, [q]);

  const total = artists.length + events.length;
  useEffect(() => setActive(0), [q]);

  function choose(i: number) {
    if (i < artists.length) {
      const a = artists[i];
      setOpen(false);
      router.push(`/artists/${a.slug}`);
    } else {
      const e = events[i - artists.length];
      if (!e) return;
      setOpen(false);
      router.push(`/events/${e.slug}`);
    }
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <SearchIcon width={17} height={17} />
      </button>
    );
  }

  const rowCls = (i: number) =>
    `flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
      active === i ? "bg-surface-hover" : ""
    }`;

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 focus-within:border-transparent focus-within:ring-2 focus-within:ring-accent">
        <SearchIcon width={17} height={17} className="shrink-0 text-faint" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onInputKey}
          placeholder="Search events & artists…"
          style={{ outline: "none", boxShadow: "none" }}
          className="w-full bg-transparent py-2.5 text-sm text-fg placeholder:text-faint"
        />
        <button
          onClick={() => setOpen(false)}
          aria-label="Close search"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <XIcon width={15} height={15} />
        </button>
      </div>

      <div className="animate-fade-up absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-pop)]">
        {total === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-fg">No matches</p>
            <p className="mt-1 text-sm text-muted">
              Nothing for &ldquo;{q}&rdquo; — try an artist or venue.
            </p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {popular && (
              <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-faint">
                Popular right now
              </p>
            )}
            {artists.length > 0 && (
              <>
                {!popular && (
                  <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-faint">
                    Artists
                  </p>
                )}
                {artists.map((a, i) => (
                  <button
                    key={a.slug}
                    onMouseMove={() => setActive(i)}
                    onClick={() => choose(i)}
                    className={rowCls(i)}
                  >
                    <Avatar name={a.name} size={36} ring={false} src={a.photo} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 truncate text-sm font-semibold text-fg">
                        {a.name}
                        {a.verified && (
                          <CheckCircleIcon width={13} height={13} className="shrink-0 text-accent" />
                        )}
                      </p>
                      <p className="truncate text-xs text-muted">Artist · {a.role}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
            {events.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-faint">
                  Events
                </p>
                {events.map((e, j) => {
                  const i = artists.length + j;
                  return (
                    <button
                      key={e.id}
                      onMouseMove={() => setActive(i)}
                      onClick={() => choose(i)}
                      className={rowCls(i)}
                    >
                      <div className="h-9 w-9 shrink-0">
                        <EventCover
                          src={e.image}
                          alt={e.title}
                          accent={e.accent}
                          className="h-full w-full"
                          rounded="rounded-lg"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-fg">{e.title}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          <CalendarIcon width={12} height={12} className="text-faint" />
                          {dateShort(e.date)} · {e.venue}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
