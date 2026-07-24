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

// Local-only state. Saved events, artist subscriptions and orders stay in
// localStorage until those BE modules are connected; identity (signedIn,
// profile) comes from the better-auth session + GET /api/v1/me.
interface Persisted {
  savedSlugs: string[];
  subscribedArtists: string[];
  orders: Order[];
}

interface UserValue extends Persisted {
  hydrated: boolean;
  signedIn: boolean;
  profile: Profile;
  signOut: () => void;
  updateProfile: (patch: Partial<Profile>) => void;
  toggleSaved: (slug: string) => void;
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
  savedSlugs: [],
  subscribedArtists: [],
  orders: [],
};

const Ctx = createContext<UserValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [storageHydrated, setStorageHydrated] = useState(false);
  // Profile fetched from /api/v1/me, keyed by user so a stale fetch never
  // bleeds across sign-ins. The exposed profile derives from the session.
  const [remote, setRemote] = useState<{ userId: string; profile: Profile } | null>(null);
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
      try {
        const res = await fetch(`${API_URL}/api/v1/me`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`GET /me ${res.status}`);
        const body = (await res.json()) as { data: { profile: Profile } };
        profile = body.data.profile;
      } catch {
        // Session exists but /me failed — fall back to the session user.
        profile = {
          ...emptyProfile,
          name: name ?? "",
          email: email ?? "",
          ...(image ? { picture: image } : {}),
        };
      }
      if (!cancelled) setRemote({ userId, profile });
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const profileLoaded = Boolean(session && remote?.userId === session.user.id);
  const profile: Profile =
    signedIn && profileLoaded ? remote!.profile : emptyProfile;

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
    }).catch(() => {});
  }, []);

  const toggleSaved = useCallback((slug: string) => {
    setState((s) => ({
      ...s,
      savedSlugs: s.savedSlugs.includes(slug)
        ? s.savedSlugs.filter((x) => x !== slug)
        : [slug, ...s.savedSlugs],
    }));
  }, []);

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
    signOut,
    updateProfile,
    toggleSaved,
    isSaved: (slug: string) => state.savedSlugs.includes(slug),
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
