"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { NavSearch } from "./NavSearch";
import { AccountButton } from "./AccountButton";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/artists", label: "Artists" },
];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The auth screen renders its own logo over the artwork.
  if (pathname === "/signin") return null;

  return (
    <header
      className={`glass sticky top-0 z-40 border-b transition-[border-color,box-shadow] duration-300 ${
        scrolled ? "border-line shadow-[0_4px_20px_rgba(0,0,0,0.06)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        {/* logo (hides on mobile while searching) */}
        <div className={`shrink-0 ${searchOpen ? "hidden sm:block" : ""}`}>
          <Logo />
        </div>

        {/* primary links (stay visible; search expands into the free space) */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-surface-hover text-fg"
                    : "text-muted hover:bg-surface-hover hover:text-fg"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* search (icon → expands leftward; right edge stays pinned to the account) */}
        <div className="flex min-w-0 flex-1 justify-end">
          <div className={searchOpen ? "w-full sm:max-w-md" : ""}>
            <NavSearch open={searchOpen} setOpen={setSearchOpen} />
          </div>
        </div>

        {/* account (hides on mobile while searching) */}
        <div className={`shrink-0 items-center ${searchOpen ? "hidden sm:flex" : "flex"}`}>
          <AccountButton />
        </div>
      </div>
    </header>
  );
}
