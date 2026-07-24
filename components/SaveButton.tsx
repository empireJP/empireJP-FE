"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/lib/user";
import { HeartIcon } from "./Icons";

export function SaveButton({
  id,
  slug,
  className = "",
  size = 32,
}: {
  id: string;
  slug: string;
  className?: string;
  size?: number;
}) {
  const router = useRouter();
  const { isSaved, toggleSaved, hydrated, signedIn } = useUser();
  const saved = hydrated && isSaved(slug);

  return (
    <button
      type="button"
      aria-label={saved ? "Remove from saved" : "Save event"}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          router.push("/signin");
          return;
        }
        toggleSaved({ id, slug });
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
