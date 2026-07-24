"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { EventItem, Order } from "./types";
import { getEvent } from "./data";

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

interface Persisted {
  signedIn: boolean;
  seeded: boolean;
  profile: Profile;
  savedSlugs: string[];
  subscribedArtists: string[];
  orders: Order[];
}

interface UserValue extends Persisted {
  hydrated: boolean;
  signIn: (email: string) => void;
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
  signedIn: false,
  seeded: false,
  profile: emptyProfile,
  savedSlugs: [],
  subscribedArtists: [],
  orders: [],
};

const Ctx = createContext<UserValue | null>(null);

function rand(len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function nameFromEmail(email: string) {
  const first = email.split("@")[0].replace(/[._-]+/g, " ").trim().split(" ")[0] || "You";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Build a plausible order from an event (used to seed the demo account). */
function demoOrder(event: EventItem, tierId: string, qty: number, holder: string, email: string): Order {
  const tier = event.tiers.find((t) => t.id === tierId) ?? event.tiers.find((t) => !t.soldOut)!;
  const subtotal = tier.price * qty;
  const fees = tier.fee * qty;
  return {
    code: `EMP-${rand(4)}-${rand(4)}`,
    eventSlug: event.slug,
    eventTitle: event.title,
    lines: [{ tierName: tier.name, qty, price: tier.price }],
    subtotal,
    fees,
    discount: 0,
    total: subtotal + fees,
    buyerName: holder,
    buyerEmail: email,
    tickets: Array.from({ length: qty }, () => ({
      code: `${rand(4)}-${rand(4)}`,
      tierName: tier.name,
      holder,
    })),
  };
}

function seedContent(email: string): Pick<Persisted, "savedSlugs" | "subscribedArtists" | "orders"> {
  const name = nameFromEmail(email);
  const sudbeat = getEvent("sudbeat-showcase-colombo");
  const orders = sudbeat ? [demoOrder(sudbeat, "final", 2, name, email)] : [];
  return {
    savedSlugs: ["kyotto-open-to-close", "flying-dust-nye"],
    subscribedArtists: ["hernan-cattaneo", "ultra"],
    orders,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [hydrated, setHydrated] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
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

  const signIn = useCallback((email: string) => {
    setState((s) => {
      const profile = {
        ...s.profile,
        email,
        name: s.profile.name || nameFromEmail(email),
      };
      if (!s.seeded) {
        const seed = seedContent(email);
        return {
          ...s,
          signedIn: true,
          seeded: true,
          profile,
          savedSlugs: [...new Set([...s.savedSlugs, ...seed.savedSlugs])],
          subscribedArtists: [...new Set([...s.subscribedArtists, ...seed.subscribedArtists])],
          orders: [...s.orders, ...seed.orders],
        };
      }
      return { ...s, signedIn: true, profile };
    });
  }, []);

  const signOut = useCallback(() => {
    setState((s) => ({ ...s, signedIn: false }));
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
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
    hydrated,
    signIn,
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
