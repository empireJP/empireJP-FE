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
import type { CartLine, CreatedOrder, EventItem, Order, PaymentProviderId } from "./types";
import { ApiError, createOrder, getEvent, getOrder, validateCoupon } from "./api";
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
  /** The applied code, normalized by the API. */
  couponLabel: string | null;
  /** Set when a code that was accepted has since stopped applying to this
   *  cart — the buyer removed the tier it targeted, dropped below its minimum
   *  spend, or it was disabled while they shopped. */
  couponError: string | null;
  couponPending: boolean;
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
  /** Validates against the API and applies on success. The error is the API's
   *  own reason, which is far more useful than "invalid". */
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string }>;
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

/**
 * What the API last said this cart's promo code is worth.
 *
 * Deliberately not persisted and never computed here. Coupons used to be a
 * hardcoded table in this file, which meant a code a business actually created
 * was rejected in the browser before the API ever saw it — and the rules that
 * decide a discount (tier targeting, caps, minimum spend, per-buyer limits)
 * have no client-side answer anyway. The `discount` below is a preview of the
 * API's number; order creation recomputes it from the code regardless.
 */
interface CouponState {
  discount: number;
  /** Buyer-readable reason the code stopped applying, straight from the API. */
  error: string | null;
  pending: boolean;
}

const noCoupon: CouponState = { discount: 0, error: null, pending: false };

/** Tier ids + quantities, which is all the API wants — prices stay server-side. */
function cartLines(event: EventItem | null, lines: Record<string, number>): CartLine[] {
  if (!event) return [];
  return event.tiers
    .filter((t) => (lines[t.id] ?? 0) > 0)
    .map((t) => ({ tierId: t.id, qty: lines[t.id]! }));
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
  // Only the code is persisted; what it's worth is the API's answer about the
  // current cart, so it's re-fetched rather than restored.
  const [coupon, setCoupon] = useState<CouponState>(noCoupon);
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
    // Clamped to the subtotal rather than trusted outright: the coupon state
    // can be one render behind the cart (the buyer drops a ticket, the
    // revalidation hasn't landed), and showing a total lower than the API will
    // charge is the one direction that must never happen.
    const discount = state.coupon ? Math.min(coupon.discount, subtotal) : 0;
    return {
      count,
      subtotal,
      fees,
      discount,
      couponLabel: state.coupon,
      couponError: coupon.error,
      couponPending: coupon.pending,
      total: Math.max(0, subtotal + fees - discount),
    };
  }, [event, state.lines, state.coupon, coupon]);

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

  /**
   * Applies a code by asking the API what it's worth, and only stores it if
   * the API accepts. The rejection message is the API's own — it knows which
   * of a dozen rules failed, and repeating a generic "that code isn't valid"
   * here would throw that away.
   */
  const applyCoupon = useCallback(
    async (code: string): Promise<{ ok: boolean; error?: string }> => {
      const key = code.trim().toUpperCase();
      if (!key) return { ok: false, error: "Enter a code." };
      if (!event) return { ok: false, error: "Your cart is no longer available." };

      const lines = cartLines(event, state.lines);
      if (lines.length === 0) return { ok: false, error: "Add a ticket first." };

      setCoupon({ discount: 0, error: null, pending: true });
      try {
        const applied = await validateCoupon({
          code: key,
          eventSlug: event.slug,
          lines,
          ...(state.buyer.email ? { email: state.buyer.email } : {}),
        });
        setCoupon({ discount: applied.discount, error: null, pending: false });
        setState((s) => ({ ...s, coupon: applied.code }));
        log.debug("coupon applied", { code: applied.code });
        return { ok: true };
      } catch (err) {
        setCoupon(noCoupon);
        // A rejected code is a routine outcome, not a fault — lib/api.ts has
        // already logged anything that was actually broken.
        const message =
          err instanceof ApiError ? err.message : "We couldn't check that code. Try again.";
        return { ok: false, error: message };
      }
    },
    [event, state.lines, state.buyer.email],
  );

  const removeCoupon = useCallback(() => {
    setCoupon(noCoupon);
    setState((s) => ({ ...s, coupon: null }));
  }, []);

  /**
   * Re-prices an applied coupon whenever the cart changes.
   *
   * Necessary because the discount is a function of the cart, not of the code:
   * a percentage moves with the subtotal, a tier-targeted code stops applying
   * when that tier is removed, and a minimum-spend code falls away below its
   * threshold. Without this the buyer would keep seeing the discount from the
   * cart they *had*, and only find out at checkout.
   *
   * Every state write is inside a promise callback, never in the effect body —
   * a synchronous setState here is the pattern the lint baseline is trying to
   * stop spreading.
   */
  useEffect(() => {
    const code = state.coupon;
    if (!code || !event) return;
    const lines = cartLines(event, state.lines);
    if (lines.length === 0) return;

    let stale = false;
    validateCoupon({
      code,
      eventSlug: event.slug,
      lines,
      ...(state.buyer.email ? { email: state.buyer.email } : {}),
    })
      .then((applied) => {
        if (!stale) setCoupon({ discount: applied.discount, error: null, pending: false });
      })
      .catch((err) => {
        if (stale) return;
        // The code was valid when applied and isn't now. The summary shows the
        // message, but the drop is invisible in the totals otherwise.
        const message =
          err instanceof ApiError ? err.message : "We couldn't re-check that code.";
        setCoupon({ discount: 0, error: message, pending: false });
        log.warn("applied coupon no longer valid for this cart", { code, reason: message });
      });

    return () => {
      stale = true;
    };
  }, [event, state.lines, state.coupon, state.buyer.email]);

  const placeOrder = useCallback(
    async (paymentProvider: PaymentProviderId): Promise<CreatedOrder> => {
      if (!event) throw new Error("Your cart is no longer available.");

      // Tier ids and quantities only. Prices, fees and the coupon discount are
      // all recomputed by the API from its own catalog — nothing the browser
      // says about money is trusted, which is also why the totals rendered in
      // the summary are a preview rather than an input.
      const lines = cartLines(event, state.lines);
      if (lines.length === 0) throw new Error("Your cart is empty.");

      // A code the API has already told us no longer applies is left off the
      // order. Sending it would fail the whole checkout over a discount the
      // buyer can see is worth nothing — the summary shows the code in its
      // rejected state with the reason, and the total is already full price.
      const sendCoupon = state.coupon !== null && coupon.error === null;
      if (state.coupon !== null && !sendCoupon) {
        log.warn("placing order without the applied coupon", {
          code: state.coupon,
          reason: coupon.error,
        });
      }

      const created = await createOrder({
        eventSlug: event.slug,
        lines,
        buyer: {
          name: state.buyer.name || "Guest",
          email: state.buyer.email,
          ...(state.buyer.phone ? { phone: state.buyer.phone } : {}),
        },
        ...(sendCoupon ? { couponCode: state.coupon! } : {}),
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
    // `state.eventSlug` for the pre-redirect persist above; `coupon.error` so
    // a code that has stopped applying is dropped from the order rather than
    // failing it.
    [event, state.eventSlug, state.lines, state.buyer, state.coupon, coupon.error],
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

  const reset = useCallback(() => {
    setState(empty);
    setCoupon(noCoupon);
  }, []);

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
