"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CompassIcon, TicketIcon, UsersIcon } from "./Icons";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: CompassIcon },
  { href: "/dashboard/audience", label: "Audience", icon: UsersIcon },
];

export function DashboardTabs() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface-hover hover:text-fg"
            }`}
          >
            <Icon width={16} height={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function NewEventButton() {
  return (
    <button className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover">
      <TicketIcon width={16} height={16} /> New event
    </button>
  );
}
