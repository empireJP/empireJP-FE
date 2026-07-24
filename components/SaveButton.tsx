"use client";

import { useUser } from "@/lib/user";
import { HeartIcon } from "./Icons";

export function SaveButton({
  slug,
  className = "",
  size = 32,
}: {
  slug: string;
  className?: string;
  size?: number;
}) {
  const { isSaved, toggleSaved, hydrated } = useUser();
  const saved = hydrated && isSaved(slug);

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save event"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSaved(slug);
      }}
      style={{ width: size, height: size }}
      className={`grid place-items-center rounded-full bg-black/45 backdrop-blur-sm transition-all hover:bg-black/65 active:scale-90 ${className}`}
    >
      <HeartIcon
        width={size * 0.5}
        height={size * 0.5}
        fill={saved ? "currentColor" : "none"}
        className={saved ? "text-accent" : "text-white"}
      />
    </button>
  );
}
