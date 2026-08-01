"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, XIcon } from "./Icons";

/**
 * Hosts the API accepts as an embeddable link (src/lib/trailer-url.ts on the
 * BE). Kept in sync with that allowlist: a host it stores but we don't know
 * here would otherwise reach the file branch and render a dead <video>.
 */
const EMBED_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
]);

/** A watch link we can embed, an uploaded file we can play, or neither. */
type Trailer =
  | { kind: "embed"; src: string }
  | { kind: "file"; src: string }
  | { kind: "unplayable" };

function youtubeId(u: URL): string | null {
  const v = u.searchParams.get("v");
  if (v) return v;
  // /embed/<id>, /shorts/<id>, /live/<id> — all single-segment id paths.
  const m = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname);
  return m ? m[1] : null;
}

export function resolveTrailer(url: string): Trailer {
  let u: URL;
  try {
    u = new URL(url, "http://localhost");
  } catch {
    return { kind: "unplayable" };
  }

  const host = u.hostname.replace(/^www\./, "");
  if (!EMBED_HOSTS.has(host)) {
    // Not a watch link — an uploaded mp4/webm served by the API.
    return { kind: "file", src: url };
  }

  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return id
      ? { kind: "embed", src: `https://www.youtube.com/embed/${id}?autoplay=1` }
      : { kind: "unplayable" };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    const id = youtubeId(u);
    return id
      ? { kind: "embed", src: `https://www.youtube.com/embed/${id}?autoplay=1` }
      : { kind: "unplayable" };
  }
  // vimeo.com/<id> and player.vimeo.com/video/<id>
  const id = /(\d+)/.exec(u.pathname)?.[1];
  return id
    ? { kind: "embed", src: `https://player.vimeo.com/video/${id}?autoplay=1` }
    : { kind: "unplayable" };
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
  const trailer = url ? resolveTrailer(url) : null;

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

  // An unrecognisable link is treated as no trailer rather than handed to
  // <video>, which would render a dead player instead of a clear empty state.
  if (!trailer || trailer.kind === "unplayable") {
    return (
      <button
        type="button"
        disabled
        title={
          trailer
            ? "This event's trailer link can't be played"
            : "No trailer available for this event"
        }
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
              {trailer.kind === "embed" ? (
                <iframe
                  src={trailer.src}
                  title={`${title} trailer`}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <video
                  src={trailer.src}
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
