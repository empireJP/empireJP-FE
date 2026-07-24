"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, HomeIcon, UsersIcon } from "./Icons";

const ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/events", label: "Events", Icon: GridIcon },
  { href: "/artists", label: "Artists", Icon: UsersIcon },
] as const;

// routes where the immersive flow shouldn't be covered by a floating bar
const HIDE_ON = ["/checkout", "/signin", "/organizers", "/dashboard"];

export function BottomNav() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-3 bottom-3 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-center gap-1 rounded-full border border-white/10 bg-[#0b0b0f]/95 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center justify-center gap-2 rounded-full transition-colors duration-300 ease-out ${
                  active
                    ? "bg-white/12 text-white"
                    : "text-white/55 active:scale-95 active:text-white/80"
                }`}
              >
                <Icon width={21} height={21} className="shrink-0" />
                <span className="whitespace-nowrap text-sm font-semibold">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
