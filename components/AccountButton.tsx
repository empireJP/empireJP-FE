"use client";

import Link from "next/link";
import { useUser } from "@/lib/user";
import { hashHue, initials } from "@/lib/format";

export function AccountButton() {
  const { signedIn, profile, hydrated } = useUser();

  if (hydrated && signedIn) {
    const display = profile.name || profile.email || "You";
    const first = (profile.name || display).split(" ")[0];
    return (
      <Link
        href="/account"
        aria-label="Your account"
        className="flex items-center gap-2 rounded-xl border border-line bg-surface py-1 pl-1 pr-1 transition-colors hover:bg-surface-hover sm:pr-2.5"
      >
        {profile.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.picture}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span
            className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: `hsl(${hashHue(display)} 48% 46%)` }}
          >
            {initials(display)}
          </span>
        )}
        <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-fg sm:block">
          {first}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/signin"
      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.97]"
    >
      Sign in
    </Link>
  );
}
