"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EventItem } from "@/lib/types";
import { EventCover } from "./EventCover";
import { fromPrice } from "./EventCard";
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, PinIcon } from "./Icons";
import { dateShort, money, to12h } from "@/lib/format";

export function HeroSlider({ events }: { events: EventItem[] }) {
  const router = useRouter();
  const n = events.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useRef(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const to = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);
  const go = useCallback((dir: number) => setActive((a) => (a + dir + n) % n), [n]);

  // autoplay (pauses on hover, skips under reduced-motion)
  useEffect(() => {
    if (paused || reduce.current || n <= 1) return;
    const id = setInterval(() => setActive((a) => (a + 1) % n), 5200);
    return () => clearInterval(id);
  }, [paused, n]);

  if (n === 0) return null;
  const activeEvent = events[active];
  const from = fromPrice(activeEvent);

  return (
    <div
      className="select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* 3D stage */}
      <div
        className="relative mx-auto h-[330px] w-full max-w-3xl sm:h-[420px]"
        style={{ perspective: "1500px" }}
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (startX.current == null) return;
          const dx = e.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          startX.current = null;
        }}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {events.map((e, i) => {
            let diff = i - active;
            if (diff > n / 2) diff -= n;
            if (diff < -n / 2) diff += n;
            const abs = Math.abs(diff);
            const sign = Math.sign(diff);
            const visible = abs <= 2;
            const isActive = diff === 0;
            const transform = `translate(-50%, -50%) translateX(${diff * 46}%) translateZ(${-abs * 150}px) rotateY(${-sign * 26}deg) scale(${1 - abs * 0.11})`;
            return (
              <button
                key={e.id}
                type="button"
                aria-label={isActive ? `Open ${e.title}` : `Show ${e.title}`}
                aria-current={isActive || undefined}
                tabIndex={visible ? 0 : -1}
                onClick={() => (isActive ? router.push(`/events/${e.slug}`) : to(i))}
                className="absolute left-1/2 top-1/2 aspect-[4/5] h-full cursor-pointer rounded-2xl transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform focus-visible:outline-none"
                style={{
                  transform,
                  opacity: visible ? (abs === 0 ? 1 : abs === 1 ? 0.72 : 0.34) : 0,
                  zIndex: 50 - abs,
                  pointerEvents: visible ? "auto" : "none",
                  filter: isActive ? "none" : "brightness(0.8)",
                }}
              >
                <EventCover
                  src={e.image}
                  alt={e.title}
                  accent={e.accent}
                  priority={i < 3}
                  rounded="rounded-2xl"
                  className={`h-full w-full ${
                    isActive
                      ? "shadow-[var(--shadow-pop)] ring-1 ring-line-strong"
                      : "shadow-[var(--shadow-card)]"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* side switchers */}
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous event"
          className="absolute left-1 top-1/2 z-[55] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/40 text-fg backdrop-blur-md transition-all hover:scale-105 hover:border-line-strong hover:bg-surface active:scale-95 sm:left-2"
        >
          <ArrowLeftIcon width={18} height={18} />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next event"
          className="absolute right-1 top-1/2 z-[55] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-bg/40 text-fg backdrop-blur-md transition-all hover:scale-105 hover:border-line-strong hover:bg-surface active:scale-95 sm:right-2"
        >
          <ArrowRightIcon width={18} height={18} />
        </button>
      </div>

      {/* caption (crossfades on change) */}
      <div className="mx-auto mt-6 max-w-md px-4 text-center">
        <div key={active} className="animate-fade-up">
          <div className="flex items-center justify-center gap-2">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
              {activeEvent.category}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted">
              <CalendarIcon width={14} height={14} className="text-faint" />
              {dateShort(activeEvent.date)} · {to12h(activeEvent.startTime)}
            </span>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {activeEvent.title}
          </h2>
          <p className="mt-1 flex items-center justify-center gap-1 text-sm text-muted">
            <PinIcon width={14} height={14} className="text-faint" />
            {activeEvent.venue} · {activeEvent.area}, {activeEvent.city}
          </p>
        </div>

        <Link
          href={`/events/${activeEvent.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-sm transition-transform hover:bg-primary-hover active:scale-[0.97]"
        >
          {from === 0
            ? "Free · Get tickets"
            : from !== null
            ? `From ${money(from, activeEvent.currency)} · Get tickets`
            : "View event"}
          <ArrowRightIcon width={16} height={16} />
        </Link>
      </div>

      {/* position dots */}
      <div className="mt-5 flex items-center justify-center gap-1.5">
        {events.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => to(i)}
            aria-label={`Go to event ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-primary" : "w-2 bg-line-strong hover:bg-faint"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
