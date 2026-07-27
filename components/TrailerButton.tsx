"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, XIcon } from "./Icons";

/** YouTube/Vimeo links play in an iframe; anything else is treated as a file. */
function embedSrc(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url, "http://localhost");
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    return `https://www.youtube.com/embed${u.pathname}?autoplay=1`;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const v = u.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
    if (u.pathname.startsWith("/embed/")) return `https://www.youtube.com${u.pathname}?autoplay=1`;
  }
  if (host === "vimeo.com") {
    return `https://player.vimeo.com/video${u.pathname}?autoplay=1`;
  }
  return null;
}

export function TrailerButton({
  url,
  title,
}: {
  url?: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const embed = url ? embedSrc(url) : null;

  const close = useCallback(() => setOpen(false), []);

  // lock scroll and wire Escape while the player is up
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!url) {
    return (
      <button
        type="button"
        disabled
        title="No trailer available for this event"
        className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-faint"
      >
        <PlayIcon width={16} height={16} />
        No trailer
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-fg transition-colors hover:border-line-strong hover:bg-surface-2"
      >
        <PlayIcon width={16} height={16} />
        Watch trailer
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} trailer`}
          onClick={close}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black shadow-[var(--shadow-pop)]"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close trailer"
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
            >
              <XIcon width={18} height={18} />
            </button>
            <div className="aspect-video w-full">
              {embed ? (
                <iframe
                  src={embed}
                  title={`${title} trailer`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <video
                  src={url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full bg-black"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
