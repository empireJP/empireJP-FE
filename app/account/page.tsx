"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, type Profile } from "@/lib/user";
import { getEvent, getSavedEvents } from "@/lib/api";
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
import { hasErrors, validateProfile } from "@/lib/validation";

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
    isSaved,
    subscribedArtists,
    orders,
    signOut,
    updateProfile,
  } = useUser();

  const [tab, setTab] = useState<Tab>("tickets");
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [savedEvents, setSavedEvents] = useState<EventItem[] | null>(null);
  const [orderEvents, setOrderEvents] = useState<Record<string, EventItem>>({});

  useEffect(() => setForm(profile), [hydrated, signedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Server list for the saved tab; re-fetched each time the tab opens.
  useEffect(() => {
    if (tab !== "saved" || !signedIn) return;
    let cancelled = false;
    getSavedEvents()
      .then((evs) => {
        if (!cancelled) setSavedEvents(evs);
      })
      .catch(() => {
        if (!cancelled) setSavedEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, signedIn]);

  // Resolve order events from the API (orders themselves are still local
  // until Phase 3).
  useEffect(() => {
    if (!signedIn || orders.length === 0) return;
    let cancelled = false;
    const slugs = [...new Set(orders.map((o) => o.eventSlug))];
    Promise.all(slugs.map((s) => getEvent(s).catch(() => undefined))).then(
      (evs) => {
        if (cancelled) return;
        const map: Record<string, EventItem> = {};
        slugs.forEach((s, i) => {
          const e = evs[i];
          if (e) map[s] = e;
        });
        setOrderEvents(map);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [signedIn, orders]);

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

  // Optimistic removal: unhearting drops the slug from provider state, so
  // filtering the fetched list by isSaved updates the grid immediately.
  const visibleSaved = (savedEvents ?? []).filter((e) => isSaved(e.slug));
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
    { key: "saved", label: "Saved", icon: HeartIcon, count: savedSlugs.length },
    { key: "following", label: "Following", icon: BellIcon, count: followed.length },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ];

  // Derived, so a corrected field clears as the user types once they've tried
  // to save at least once.
  const profileErrors = validateProfile(form);
  const shown = validated ? profileErrors : {};

  async function saveSettings() {
    if (savingProfile) return;
    setValidated(true);
    setProfileError(null);
    if (hasErrors(profileErrors)) return;

    setSavingProfile(true);
    // Only the fields the API accepts. `email` is stripped by patchMeSchema,
    // so sending it would look like a save that did nothing.
    const message = await updateProfile({
      name: form.name.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      notifyDrops: form.notifyDrops,
      notifyReminders: form.notifyReminders,
    });
    setSavingProfile(false);

    if (message) {
      setProfileError(message);
      return;
    }
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
                const event = orderEvents[order.eventSlug];
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
                        <p className="text-muted">{money(order.total, order.currency)}</p>
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
          (savedEvents === null ? (
            <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
          ) : visibleSaved.length === 0 ? (
            <Empty
              icon={<HeartIcon width={26} height={26} />}
              title="No saved events"
              body="Tap the heart on any event to keep it here for later."
              href="/events"
              cta="Browse events"
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleSaved.map((e) => (
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
                {/* No maxLength: it truncates a paste silently, which on a
                    name means saving something the user never typed. The
                    length rule lives in validateProfile, where it can speak. */}
                <Field
                  label="Full name"
                  error={shown.name}
                  errorId="profile-name-error"
                >
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    placeholder="Your name"
                    aria-invalid={!!shown.name}
                    aria-describedby={
                      shown.name ? "profile-name-error" : undefined
                    }
                  />
                </Field>
                {/* Read-only: email is the auth identity, and patchMeSchema
                    strips it — an editable field here would accept edits that
                    silently never save. */}
                <Field
                  label="Email"
                  hint="Your email is how you sign in and can't be changed here."
                >
                  {/* readOnly, not disabled: `disabled` drops the field from
                      the tab order, so a keyboard user could no longer reach
                      it to read their own address. */}
                  <input
                    type="email"
                    value={form.email}
                    readOnly
                    className={`${inputCls} cursor-not-allowed opacity-60`}
                    placeholder="you@email.com"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Mobile"
                    error={shown.phone}
                    errorId="profile-phone-error"
                  >
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputCls}
                      placeholder="+94 …"
                      inputMode="tel"
                      aria-invalid={!!shown.phone}
                      aria-describedby={
                        shown.phone ? "profile-phone-error" : undefined
                      }
                    />
                  </Field>
                  <Field
                    label="City"
                    error={shown.city}
                    errorId="profile-city-error"
                  >
                    <input
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className={inputCls}
                      aria-invalid={!!shown.city}
                      aria-describedby={
                        shown.city ? "profile-city-error" : undefined
                      }
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

            {profileError && (
              <p role="alert" className="mt-4 text-sm text-danger">
                {profileError}
              </p>
            )}

            <button
              onClick={() => void saveSettings()}
              disabled={savingProfile}
              className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {savingProfile ? (
                "Saving…"
              ) : saved ? (
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

// The message sits *outside* the <label>: text inside a label becomes part of
// the control's accessible name, so an inline error there makes the field
// announce as "Full name Name is required." It is linked with
// aria-describedby instead, which is what screen readers expect.
function Field({
  label,
  error,
  hint,
  errorId,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  /** Must match the input's aria-describedby. */
  errorId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-fg">{label}</span>
        {children}
      </label>
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-faint">{hint}</span>
      ) : null}
    </div>
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
