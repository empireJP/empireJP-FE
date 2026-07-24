"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { EventItem, Order } from "./types";
import { getEvent } from "./data";

const KEY = "pulse-checkout-v1";

interface Buyer {
  email: string;
  name: string;
  phone: string;
}

interface Persisted {
  eventSlug: string | null;
  lines: Record<string, number>;
  buyer: Buyer;
  coupon: string | null;
  order: Order | null;
}

interface Totals {
  count: number;
  subtotal: number;
  fees: number;
  discount: number;
  couponLabel: string | null;
  total: number;
}

interface CheckoutValue extends Persisted {
  hydrated: boolean;
  event: EventItem | null;
  totals: Totals;
  startCheckout: (slug: string, initial?: Record<string, number>) => void;
  setQty: (tierId: string, qty: number) => void;
  setBuyer: (patch: Partial<Buyer>) => void;
  applyCoupon: (code: string) => { ok: boolean; error?: string };
  removeCoupon: () => void;
  placeOrder: () => Order | null;
  reset: () => void;
}

/** Promo codes (case-insensitive). */
const COUPONS: Record<string, { type: "percent" | "fixed"; value: number; label: string }> = {
  RAVE10: { type: "percent", value: 10, label: "RAVE10 · 10% off" },
  EMPIRE20: { type: "percent", value: 20, label: "EMPIRE20 · 20% off" },
  FIRST5: { type: "fixed", value: 5, label: "FIRST5 · $5 off" },
};

function couponDiscount(code: string | null, subtotal: number) {
  const c = code ? COUPONS[code] : null;
  if (!c) return 0;
  return c.type === "percent"
    ? Math.round((subtotal * c.value) / 100)
    : Math.min(c.value, subtotal);
}

const empty: Persisted = {
  eventSlug: null,
  lines: {},
  buyer: { email: "", name: "", phone: "" },
  coupon: null,
  order: null,
};

const Ctx = createContext<CheckoutValue | null>(null);

function randCode(len: number) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function CheckoutProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [hydrated, setHydrated] = useState(false);
  const first = useRef(true);

  // hydrate once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  // persist
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const event = state.eventSlug ? getEvent(state.eventSlug) ?? null : null;

  const totals = useMemo<Totals>(() => {
    let count = 0;
    let subtotal = 0;
    let fees = 0;
    if (event) {
      for (const tier of event.tiers) {
        const qty = state.lines[tier.id] ?? 0;
        count += qty;
        subtotal += qty * tier.price;
        fees += qty * tier.fee;
      }
    }
    const discount = couponDiscount(state.coupon, subtotal);
    const couponLabel = state.coupon ? COUPONS[state.coupon]?.label ?? null : null;
    return {
      count,
      subtotal,
      fees,
      discount,
      couponLabel,
      total: Math.max(0, subtotal + fees - discount),
    };
  }, [event, state.lines, state.coupon]);

  const startCheckout = useCallback(
    (slug: string, initial: Record<string, number> = {}) => {
      setState({ ...empty, eventSlug: slug, lines: initial });
    },
    []
  );

  const setQty = useCallback((tierId: string, qty: number) => {
    setState((s) => {
      const lines = { ...s.lines };
      if (qty <= 0) delete lines[tierId];
      else lines[tierId] = qty;
      return { ...s, lines };
    });
  }, []);

  const setBuyer = useCallback((patch: Partial<Buyer>) => {
    setState((s) => ({ ...s, buyer: { ...s.buyer, ...patch } }));
  }, []);

  const applyCoupon = useCallback((code: string) => {
    const key = code.trim().toUpperCase();
    if (!key) return { ok: false, error: "Enter a code." };
    if (!COUPONS[key]) return { ok: false, error: "That code isn't valid." };
    setState((s) => ({ ...s, coupon: key }));
    return { ok: true };
  }, []);

  const removeCoupon = useCallback(() => {
    setState((s) => ({ ...s, coupon: null }));
  }, []);

  const placeOrder = useCallback((): Order | null => {
    if (!event) return null;
    const lines = event.tiers
      .filter((t) => (state.lines[t.id] ?? 0) > 0)
      .map((t) => ({
        tierName: t.name,
        qty: state.lines[t.id],
        price: t.price,
      }));
    if (lines.length === 0) return null;

    let subtotal = 0;
    let fees = 0;
    const tickets: Order["tickets"] = [];
    for (const t of event.tiers) {
      const qty = state.lines[t.id] ?? 0;
      subtotal += qty * t.price;
      fees += qty * t.fee;
      for (let i = 0; i < qty; i++) {
        tickets.push({
          code: `${randCode(4)}-${randCode(4)}`,
          tierName: t.name,
          holder: state.buyer.name || "Guest",
        });
      }
    }

    const discount = couponDiscount(state.coupon, subtotal);
    const order: Order = {
      code: `EMP-${randCode(4)}-${randCode(4)}`,
      eventSlug: event.slug,
      eventTitle: event.title,
      lines,
      subtotal,
      fees,
      discount,
      couponCode: state.coupon ?? undefined,
      total: Math.max(0, subtotal + fees - discount),
      buyerName: state.buyer.name || "Guest",
      buyerEmail: state.buyer.email,
      tickets,
    };
    setState((s) => ({ ...s, order }));
    return order;
  }, [event, state.lines, state.buyer, state.coupon]);

  const reset = useCallback(() => setState(empty), []);

  const value: CheckoutValue = {
    ...state,
    hydrated,
    event,
    totals,
    startCheckout,
    setQty,
    setBuyer,
    applyCoupon,
    removeCoupon,
    placeOrder,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCheckout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
