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
import type { CreatedOrder, EventItem, Order, PaymentProviderId } from "./types";
import { createOrder, getEvent, getOrder } from "./api";
import { createLogger } from "./logger";

const log = createLogger("checkout");

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
  eventLoading: boolean;
  totals: Totals;
  startCheckout: (slug: string, initial?: Record<string, number>) => void;
  setQty: (tierId: string, qty: number) => void;
  setBuyer: (patch: Partial<Buyer>) => void;
  applyCoupon: (code: string) => { ok: boolean; error?: string };
  removeCoupon: () => void;
  /**
   * Creates the order on the API and stores it. Resolves with the created
   * order plus, for hosted gateways, the instruction the browser needs to
   * launch payment. Rejects on failure — callers show the message.
   *
   * The order comes back PENDING: this reserves inventory and prices the cart
   * server-side, it does not take money.
   */
  placeOrder: (paymentProvider: PaymentProviderId) => Promise<CreatedOrder>;
  /** Re-reads an order from the API and updates state with it. */
  refreshOrder: (order: OrderRef) => Promise<Order | null>;
  /**
   * Polls an order until the gateway's callback marks it PAID. Resolves with
   * the paid order, with a terminal non-PAID order, or with null if nothing
   * landed within the timeout — which is not a failure: the callback can still
   * arrive, and the confirmation page says so.
   */
  awaitPaidOrder: (order: OrderRef, opts?: { timeoutMs?: number }) => Promise<Order | null>;
  reset: () => void;
}

/** Everything needed to read an order back. The email is required because an
 *  order code is short and human-readable, so the API deliberately won't hand
 *  one over on the code alone (a session covers signed-in buyers instead). */
export interface OrderRef {
  code: string;
  buyerEmail: string;
}

/** Promo codes (case-insensitive).
 *
 *  These mirror the codes the API seeds, and drive the cart preview only. The
 *  discount that is actually applied is recomputed server-side from the code
 *  we send, so a locally-edited value here changes what the buyer is *shown*,
 *  never what they are charged. */
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

/** How often the confirmation page asks the API whether the gateway callback
 *  has landed. Two seconds is well inside the API's inventory hold and slow
 *  enough that a stuck payment doesn't hammer the server. */
const ORDER_POLL_INTERVAL_MS = 2_000;
/** How long to keep waiting before telling the buyer it's taking longer than
 *  usual. Deliberately not a failure: a delayed callback still arrives, and
 *  their order still holds its seats. */
const ORDER_POLL_TIMEOUT_MS = 90_000;

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

  // The event lives in the API, not in the bundle — resolve it from the
  // persisted slug and keep the steps in a loading state until it lands.
  const [event, setEvent] = useState<EventItem | null>(null);
  const [eventLoading, setEventLoading] = useState(false);

  useEffect(() => {
    const slug = state.eventSlug;
    if (!slug) {
      setEvent(null);
      setEventLoading(false);
      return;
    }
    let stale = false;
    setEventLoading(true);
    getEvent(slug)
      .then((e) => {
        // Nothing is logged for a stale result: the user has already moved to
        // another event, and reporting the abandoned one reads as a failure
        // that never affected them.
        if (stale) return;
        setEvent(e ?? null);
        // A null event renders the checkout's "Your cart is empty" state,
        // which reads like the user did nothing wrong — say what actually
        // happened, because the UI cannot.
        if (!e) log.warn("event not found for checkout", { slug });
      })
      .catch((err) => {
        if (stale) return;
        setEvent(null);
        log.error("could not resolve the checkout event", {
          slug,
          cause: err instanceof Error ? err.message : String(err),
        });
      })
      .finally(() => {
        if (!stale) setEventLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [state.eventSlug]);

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

  const placeOrder = useCallback(
    async (paymentProvider: PaymentProviderId): Promise<CreatedOrder> => {
      if (!event) throw new Error("Your cart is no longer available.");

      // Tier ids and quantities only. Prices, fees and the coupon discount are
      // all recomputed by the API from its own catalog — nothing the browser
      // says about money is trusted, which is also why the totals rendered in
      // the summary are a preview rather than an input.
      const lines = event.tiers
        .filter((t) => (state.lines[t.id] ?? 0) > 0)
        .map((t) => ({ tierId: t.id, qty: state.lines[t.id]! }));
      if (lines.length === 0) throw new Error("Your cart is empty.");

      const created = await createOrder({
        eventSlug: event.slug,
        lines,
        buyer: {
          name: state.buyer.name || "Guest",
          email: state.buyer.email,
          ...(state.buyer.phone ? { phone: state.buyer.phone } : {}),
        },
        ...(state.coupon ? { couponCode: state.coupon } : {}),
        paymentProvider,
      });

      log.info("order created", {
        code: created.code,
        status: created.status,
        provider: created.paymentProvider,
      });
      setState((s) => ({ ...s, order: created }));
      // ALSO persisted synchronously, not only via the state effect: a
      // redirect-style gateway (KOMOJU) navigates away in the same tick, and
      // React's persist effect may not have run yet — without this line the
      // buyer would come back from the hosted page to an empty cart.
      try {
        sessionStorage.setItem(
          KEY,
          JSON.stringify({
            eventSlug: state.eventSlug,
            lines: state.lines,
            buyer: state.buyer,
            coupon: state.coupon,
            order: created,
          } satisfies Persisted),
        );
      } catch {
        // Storage quota/privacy mode — the state effect is the primary path;
        // this is only the navigation race-guard, so a miss is survivable.
        log.warn("could not persist the order before redirect", { code: created.code });
      }
      return created;
    },
    [event, state.eventSlug, state.lines, state.buyer, state.coupon],
  );

  // Both take the order explicitly rather than reading it out of state. The
  // caller that needs them most — the payment step — calls them in the same
  // tick as placeOrder(), before React has committed the new state, so
  // anything reading from state (or a ref synced to it) would see the previous
  // order or none at all.
  const refreshOrder = useCallback(async (ref: OrderRef): Promise<Order | null> => {
    try {
      const fresh = await getOrder(ref.code, ref.buyerEmail);
      setState((s) => (s.order?.code === fresh.code ? { ...s, order: { ...s.order, ...fresh } } : s));
      return fresh;
    } catch (err) {
      // The buyer is left looking at a stale PENDING order with no explanation
      // — lib/api logged the request itself, this says what it cost us.
      log.warn("could not refresh the order", {
        code: ref.code,
        cause: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }, []);

  const awaitPaidOrder = useCallback(
    async (ref: OrderRef, { timeoutMs = ORDER_POLL_TIMEOUT_MS } = {}): Promise<Order | null> => {
      const started = Date.now();
      // Poll rather than trust the gateway's client-side "completed" callback:
      // the order becomes PAID when the gateway's server calls ours, which can
      // land before, during or shortly after the buyer closes the popup.
      while (Date.now() - started < timeoutMs) {
        const fresh = await refreshOrder(ref);
        if (fresh?.status === "PAID") {
          log.info("order confirmed paid", { code: ref.code, waitedMs: Date.now() - started });
          return fresh;
        }
        // A terminal non-PAID status will never become PAID — stop early
        // rather than spinning for the full timeout.
        if (fresh && fresh.status !== "PENDING") {
          log.warn("order reached a terminal status without being paid", {
            code: ref.code,
            status: fresh.status,
          });
          return fresh;
        }
        await new Promise((r) => setTimeout(r, ORDER_POLL_INTERVAL_MS));
      }
      // Not an error: gateway callbacks can be slow, and the confirmation page
      // keeps waiting. But it IS the shape of a broken notify URL, so it must
      // leave a trace.
      log.warn("order still pending after the polling window", { code: ref.code, timeoutMs });
      return null;
    },
    [refreshOrder],
  );

  const reset = useCallback(() => setState(empty), []);

  const value: CheckoutValue = {
    ...state,
    hydrated,
    event,
    eventLoading,
    totals,
    startCheckout,
    setQty,
    setBuyer,
    applyCoupon,
    removeCoupon,
    placeOrder,
    refreshOrder,
    awaitPaidOrder,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCheckout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
}
