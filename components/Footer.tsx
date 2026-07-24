"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

const COLUMNS: [string, [string, string][]][] = [
  [
    "Discover",
    [
      ["All events", "/events"],
      ["Artists", "/artists"],
      ["Festivals", "/events?category=Festival"],
      ["Nightlife", "/events?category=Nightlife"],
    ],
  ],
  [
    "Support",
    [
      ["Help Center", "/help"],
      ["Contact", "/contact"],
      ["Refunds", "/refunds"],
    ],
  ],
  [
    "Company",
    [
      ["About", "/about"],
      ["Terms", "/terms"],
      ["Privacy", "/privacy"],
    ],
  ],
];

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/signin") return null;

  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-28 sm:px-6 md:pb-12">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-muted">
              Tickets for the best electronic shows, festivals and club nights.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm sm:grid-cols-3">
            {COLUMNS.map(([title, items]) => (
              <div key={title} className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-faint">
                  {title}
                </span>
                {items.map(([label, href]) => (
                  <Link
                    key={label}
                    href={href}
                    className="text-muted transition-colors hover:text-fg"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-xs text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Empire Events</span>
          <span>A design demo — events, lineups &amp; people are fictional.</span>
        </div>
      </div>
    </footer>
  );
}
