"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Order } from "./types";
import { authClient, API_URL } from "./auth-client";
import { createLogger } from "./logger";

const log = createLogger("user");

const KEY = "empire-user-v1";

export interface Profile {
  name: string;
  email: string;
  phone: string;
  city: string;
  picture?: string; // e.g. a Google avatar URL, if signed up with one
  notifyDrops: boolean;
  notifyReminders: boolean;
}

// Local-only state. Artist subscriptions and orders stay in localStorage
// until those BE modules are connected; identity (signedIn, profile) and
// saved events come from the better-auth session + /api/v1/me.
interface Persisted {
  subscribedArtists: string[];
  orders: Order[];
}

interface UserValue extends Persisted {
  hydrated: boolean;
  signedIn: boolean;
  profile: Profile;
  savedSlugs: string[];
  signOut: () => void;
  updateProfile: (patch: Partial<Profile>) => void;
  toggleSaved: (ev: { id: string; slug: string }) => void;
  isSaved: (slug: string) => boolean;
  toggleSubscribe: (slug: string) => void;
  isSubscribed: (slug: string) => boolean;
  addOrder: (order: Order) => void;
}

const emptyProfile: Profile = {
  name: "",
  email: "",
  phone: "",
  city: "Colombo",
  notifyDrops: true,
  notifyReminders: true,
};

const empty: Persisted = {
  subscribedArtists: [],
  orders: [],
};

const Ctx = createContext<UserValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [storageHydrated, setStorageHydrated] = useState(false);
  // Profile + saved slugs fetched from /api/v1/me, keyed by user so a stale
  // fetch never bleeds across sign-ins. The exposed values derive from the
  // session.
  const [remote, setRemote] = useState<{
    userId: string;
    profile: Profile;
    savedSlugs: string[];
  } | null>(null);
  const first = useRef(true);

  const { data: session, isPending } = authClient.useSession();
  const signedIn = Boolean(session);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setStorageHydrated(true);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Profile follows the session: fetch the canonical shape from /api/v1/me
  // once signed in.
  useEffect(() => {
    if (!session?.user) return;
    const { id: userId, name, email, image } = session.user;
    let cancelled = false;
    (async () => {
      let profile: Profile;
      let savedSlugs: string[];
      try {
        const res = await fetch(`${API_URL}/api/v1/me`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`GET /me ${res.status}`);
        const body = (await res.json()) as {
          data: { profile: Profile; savedSlugs: string[] };
        };
        profile = body.data.profile;
        savedSlugs = body.data.savedSlugs;
      } catch (err) {
        // Session exists but /me failed — fall back to the session user. The
        // fallback is convincing enough that nobody notices the profile is a
        // stub and the saved list is empty rather than genuinely empty.
        log.error("/me failed; falling back to the session user", {
          cause: err instanceof Error ? err.message : String(err),
        });
        profile = {
          ...emptyProfile,
          name: name ?? "",
          email: email ?? "",
          ...(image ? { picture: image } : {}),
        };
        savedSlugs = [];
      }
      if (!cancelled) setRemote({ userId, profile, savedSlugs });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const profileLoaded = Boolean(session && remote?.userId === session.user.id);
  const profile: Profile =
    signedIn && profileLoaded ? remote!.profile : emptyProfile;
  const savedSlugs: string[] =
    signedIn && profileLoaded ? remote!.savedSlugs : [];

  const signOut = useCallback(() => {
    void authClient.signOut();
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    // Optimistic local update; persist to the BE in the background.
    setRemote((r) => (r ? { ...r, profile: { ...r.profile, ...patch } } : r));
    void fetch(`${API_URL}/api/v1/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch((err) => {
      // The optimistic update stays on screen, so a failure here looks like a
      // save that worked and silently didn't survive the next reload.
      log.error("profile update was not persisted", {
        fields: Object.keys(patch),
        cause: err instanceof Error ? err.message : String(err),
      });
    });
  }, []);

  const toggleSaved = useCallback(
    (ev: { id: string; slug: string }) => {
      if (!remote) return; // signed out — SaveButton redirects instead
      const wasSaved = remote.savedSlugs.includes(ev.slug);
      const userId = remote.userId;
      // Optimistic flip; the API writes by id while the UI reads by slug.
      setRemote({
        ...remote,
        savedSlugs: wasSaved
          ? remote.savedSlugs.filter((s) => s !== ev.slug)
          : [ev.slug, ...remote.savedSlugs],
      });
      void fetch(
        `${API_URL}/api/v1/me/saved-events/${encodeURIComponent(ev.id)}`,
        {
          method: wasSaved ? "DELETE" : "PUT",
          credentials: "include",
        },
      )
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status}`);
        })
        .catch((err) => {
          log.warn("save toggle failed; reverting", {
            slug: ev.slug,
            wasSaved,
            cause: err instanceof Error ? err.message : String(err),
          });
          // Revert the optimistic change — for this user's state only.
          setRemote((r) => {
            if (!r || r.userId !== userId) return r;
            return {
              ...r,
              savedSlugs: wasSaved
                ? r.savedSlugs.includes(ev.slug)
                  ? r.savedSlugs
                  : [ev.slug, ...r.savedSlugs]
                : r.savedSlugs.filter((s) => s !== ev.slug),
            };
          });
        });
    },
    [remote],
  );

  const toggleSubscribe = useCallback((slug: string) => {
    setState((s) => ({
      ...s,
      subscribedArtists: s.subscribedArtists.includes(slug)
        ? s.subscribedArtists.filter((x) => x !== slug)
        : [slug, ...s.subscribedArtists],
    }));
  }, []);

  const addOrder = useCallback((order: Order) => {
    setState((s) =>
      s.orders.some((o) => o.code === order.code)
        ? s
        : { ...s, orders: [order, ...s.orders] }
    );
  }, []);

  const value: UserValue = {
    ...state,
    hydrated: storageHydrated && !isPending && (!signedIn || profileLoaded),
    signedIn,
    profile,
    savedSlugs,
    signOut,
    updateProfile,
    toggleSaved,
    isSaved: (slug: string) => savedSlugs.includes(slug),
    toggleSubscribe,
    isSubscribed: (slug: string) => state.subscribedArtists.includes(slug),
    addOrder,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
