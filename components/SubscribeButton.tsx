"use client";

import { useUser } from "@/lib/user";
import { BellIcon, CheckIcon } from "./Icons";

export function SubscribeButton({
  slug,
  full = false,
  onImage = false,
}: {
  slug: string;
  full?: boolean;
  onImage?: boolean;
}) {
  const { isSubscribed, toggleSubscribe, hydrated } = useUser();
  const sub = hydrated && isSubscribed(slug);

  const label = sub ? "Following" : "Subscribe";
  const Icon = sub ? CheckIcon : BellIcon;

  if (full) {
    return (
      <button
        type="button"
        onClick={() => toggleSubscribe(slug)}
        aria-pressed={sub}
        className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
          sub
            ? "border border-line bg-surface text-fg hover:bg-surface-hover"
            : "bg-primary text-primary-fg hover:bg-primary-hover"
        }`}
      >
        <Icon width={16} height={16} />
        {label}
      </button>
    );
  }

  // over-image variant (Apple-Music-style card): glassy on dark artwork
  if (onImage) {
    return (
      <button
        type="button"
        aria-pressed={sub}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSubscribe(slug);
        }}
        className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 ${
          sub
            ? "border border-white/30 bg-white/10 text-white hover:bg-white/20"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        <Icon width={14} height={14} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={sub}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSubscribe(slug);
      }}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        sub
          ? "border-transparent bg-accent-soft text-accent"
          : "border-line text-fg hover:bg-surface-hover"
      }`}
    >
      <Icon width={14} height={14} />
      {label}
    </button>
  );
}
