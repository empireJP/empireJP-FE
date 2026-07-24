"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, type Profile } from "@/lib/user";
import { getEvent } from "@/lib/data";
import { getArtist, artistEvents } from "@/lib/artists";
import type { Artist } from "@/lib/artists";
import type { EventItem } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { EventCard } from "@/components/EventCard";
import { TicketsPanel } from "@/components/TicketsPanel";
import { SubscribeButton } from "@/components/SubscribeButton";
import {
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  HeartIcon,
  LogOutIcon,
  SettingsIcon,
  TicketIcon,
} from "@/components/Icons";
import { dateLong, money } from "@/lib/format";

type Tab = "tickets" | "saved" | "following" | "settings";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-surface-3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const {
    hydrated,
    signedIn,
    profile,
    savedSlugs,
    subscribedArtists,
    orders,
    signOut,
    updateProfile,
  } = useUser();

  const [tab, setTab] = useState<Tab>("tickets");
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(profile), [hydrated, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-2" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-6 py-28 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
          <TicketIcon width={26} height={26} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-fg">
          Sign in to your account
        </h1>
        <p className="mt-2 text-muted">
          See your tickets, saved events and the artists you follow.
        </p>
        <Link
          href="/signin"
          className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const savedEvents = savedSlugs
    .map(getEvent)
    .filter((e): e is EventItem => Boolean(e));
  const followed = subscribedArtists
    .map(getArtist)
    .filter((a): a is Artist => Boolean(a));

  const followedEvents: EventItem[] = (() => {
    const seen = new Set<string>();
    const out: EventItem[] = [];
    for (const a of followed) {
      for (const e of artistEvents(a)) {
        if (!seen.has(e.slug)) {
          seen.add(e.slug);
          out.push(e);
        }
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  })();

  const TABS: { key: Tab; label: string; icon: typeof TicketIcon; count?: number }[] = [
    { key: "tickets", label: "Tickets", icon: TicketIcon, count: orders.length },
    { key: "saved", label: "Saved", icon: HeartIcon, count: savedEvents.length },
    { key: "following", label: "Following", icon: BellIcon, count: followed.length },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  function saveSettings() {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      {/* header */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <Avatar name={profile.name || profile.email || "You"} size={52} ring={false} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-fg">
              {profile.name || "Your account"}
            </h1>
            <p className="text-sm text-muted">{profile.email}</p>
          </div>
        </div>
        <button
          onClick={() => {
            signOut();
            router.push("/");
          }}
          className="flex w-fit items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-fg"
        >
          <LogOutIcon width={16} height={16} /> Sign out
        </button>
      </div>

      {/* tabs */}
      <div className="no-scrollbar mt-6 flex gap-1 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-fg"
                : "text-muted hover:bg-surface-hover hover:text-fg"
            }`}
          >
            <Icon width={16} height={16} />
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={`rounded-full px-1.5 text-xs ${
                  tab === key ? "bg-white/20" : "bg-surface-3 text-fg"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* TICKETS */}
        {tab === "tickets" &&
          (orders.length === 0 ? (
            <Empty
              icon={<TicketIcon width={26} height={26} />}
              title="No tickets yet"
              body="When you buy tickets, they'll live here with a scannable QR."
              href="/events"
              cta="Explore events"
            />
          ) : (
            <div className="flex flex-col gap-6">
              {orders.map((order) => {
                const event = getEvent(order.eventSlug);
                return (
                  <div key={order.code} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <p className="font-semibold text-fg">{order.eventTitle}</p>
                        {event && (
                          <p className="text-xs text-muted">{dateLong(event.date)}</p>
                        )}
                      </div>
                      <div className="text-right text-xs">
                        <p className="font-mono font-semibold text-fg">{order.code}</p>
                        <p className="text-muted">{money(order.total)}</p>
                      </div>
                    </div>
                    {event && (
                      <div className="mt-4">
                        <TicketsPanel event={event} order={order} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        {/* SAVED */}
        {tab === "saved" &&
          (savedEvents.length === 0 ? (
            <Empty
              icon={<HeartIcon width={26} height={26} />}
              title="No saved events"
              body="Tap the heart on any event to keep it here for later."
              href="/events"
              cta="Browse events"
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {savedEvents.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ))}

        {/* FOLLOWING */}
        {tab === "following" &&
          (followed.length === 0 ? (
            <Empty
              icon={<BellIcon width={26} height={26} />}
              title="You're not following anyone yet"
              body="Subscribe to artists to get their new shows first."
              href="/artists"
              cta="Discover artists"
            />
          ) : (
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
                  Artists you follow
                </h2>
                <div className="flex flex-col gap-2">
                  {followed.map((a) => (
                    <div
                      key={a.slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3"
                    >
                      <Link href={`/artists/${a.slug}`} className="flex items-center gap-3">
                        <Avatar name={a.name} size={40} ring={false} src={a.photo} />
                        <div>
                          <p className="flex items-center gap-1 font-medium text-fg">
                            {a.name}
                            {a.verified && (
                              <CheckCircleIcon width={15} height={15} className="text-accent" />
                            )}
                          </p>
                          <p className="text-xs text-muted">{a.role}</p>
                        </div>
                      </Link>
                      <SubscribeButton slug={a.slug} />
                    </div>
                  ))}
                </div>
              </div>

              {followedEvents.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-faint">
                    <BellIcon width={15} height={15} className="text-accent" />
                    New from your artists
                  </h2>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {followedEvents.map((e) => (
                      <EventCard key={e.id} event={e} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

        {/* SETTINGS */}
        {tab === "settings" && (
          <div className="max-w-lg">
            <div className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-semibold text-fg">Profile</h2>
              <div className="mt-4 flex flex-col gap-4">
                <Field label="Full name">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={inputCls}
                    placeholder="you@email.com"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Mobile">
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputCls}
                      placeholder="+94 …"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
              <h2 className="font-semibold text-fg">Notifications</h2>
              <div className="mt-3 flex flex-col divide-y divide-line">
                <label className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-fg">New drops & presales</span>
                    <span className="text-xs text-muted">
                      Alerts when followed artists announce shows.
                    </span>
                  </span>
                  <Toggle
                    on={form.notifyDrops}
                    onChange={(v) => setForm({ ...form, notifyDrops: v })}
                  />
                </label>
                <label className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-fg">Event reminders</span>
                    <span className="text-xs text-muted">
                      A nudge the day before an event you&rsquo;re going to.
                    </span>
                  </span>
                  <Toggle
                    on={form.notifyReminders}
                    onChange={(v) => setForm({ ...form, notifyReminders: v })}
                  />
                </label>
              </div>
            </div>

            <button
              onClick={saveSettings}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98]"
            >
              {saved ? (
                <>
                  <CheckIcon width={16} height={16} /> Saved
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-fg">{label}</span>
      {children}
    </label>
  );
}

function Empty({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
        {icon}
      </span>
      <p className="mt-4 text-lg font-semibold text-fg">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      <Link
        href={href}
        className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
      >
        {cta}
      </Link>
    </div>
  );
}
