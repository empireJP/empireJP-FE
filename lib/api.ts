// Typed fetchers for the public catalog API. Works in server and client
// components alike (plain fetch + a NEXT_PUBLIC_ var). The BE serves the FE
// mock shapes verbatim, so responses are EventItem with no field mapping.
import type {
  CartLine,
  Category,
  City,
  CreatedOrder,
  EventItem,
  Order,
  PaymentMethod,
  PaymentProviderId,
} from "./types";
import { createLogger } from "./logger";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const log = createLogger("api");

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta?: PageMeta }> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1${path}`, {
      cache: "no-store",
      ...init,
    });
  } catch (err) {
    // The API being down, DNS, or — the one that cost us an afternoon — a CORS
    // rejection, which reaches JS as an indistinguishable "Failed to fetch".
    // Callers turn this into an empty state, so without this line the failure
    // leaves no trace anywhere.
    log.error("request failed before a response", {
      path,
      url: `${API_URL}/api/v1${path}`,
      durationMs: Date.now() - started,
      cause: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const body = await res.json().catch(() => null);
  // The BE echoes the id it logged the request under; carrying it here is what
  // lets one line in the browser be matched to the server's side of the story.
  const requestId = res.headers.get("x-request-id") ?? undefined;

  if (body?.error) {
    // 404s are routine (a hidden or renamed event) and callers handle them;
    // everything else is worth a warning.
    const level = res.status === 404 ? "debug" : "warn";
    log[level]("api returned an error", {
      path,
      status: res.status,
      code: body.error.code,
      requestId,
      durationMs: Date.now() - started,
    });
    throw new ApiError(res.status, body.error.code, body.error.message);
  }
  if (!res.ok || body?.data === undefined) {
    log.error("api returned an unusable response", {
      path,
      status: res.status,
      requestId,
      durationMs: Date.now() - started,
    });
    throw new Error(`API ${res.status} on ${path}`);
  }

  log.trace("api ok", { path, status: res.status, requestId, durationMs: Date.now() - started });
  return body;
}

export interface EventsQuery {
  category?: Category;
  city?: City;
  q?: string;
  featured?: boolean;
  sort?: "date" | "trending";
  page?: number;
  limit?: number;
}

export async function getEvents(
  params: EventsQuery = {},
): Promise<{ events: EventItem[]; meta: PageMeta }> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, String(value));
  }
  const query = qs.toString();
  const { data, meta } = await apiFetch<EventItem[]>(
    `/events${query ? `?${query}` : ""}`,
  );
  return { events: data, meta: meta! };
}

/** Signed-in user's saved events, newest save first. Requires a session. */
export async function getSavedEvents(): Promise<EventItem[]> {
  const { data } = await apiFetch<EventItem[]>("/me/saved-events", {
    credentials: "include",
  });
  return data;
}

/** Returns undefined on 404 so pages can call notFound(); throws otherwise. */
export async function getEvent(slug: string): Promise<EventItem | undefined> {
  try {
    const { data } = await apiFetch<EventItem>(
      `/events/${encodeURIComponent(slug)}`,
    );
    return data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

// --- Checkout ---------------------------------------------------------------

/**
 * Payment methods this API server can actually run.
 *
 * The list is server-owned rather than hardcoded here because it depends on
 * *that server's* configuration: a deployment without PayHere credentials must
 * not offer "Card / Bank", and the instant-completing `mock` method must never
 * appear in production. Empty is a legitimate answer (nothing is configured) —
 * the payment step renders that as an explanatory message, not a crash.
 */
export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await apiFetch<PaymentMethod[]>("/payments/methods");
  return data;
}

export interface ValidateCouponInput {
  code: string;
  eventSlug: string;
  lines: CartLine[];
  /** Only used for the API's per-buyer redemption cap, and only once the
   *  buyer has actually typed an address — omitting it defers that one check
   *  to order creation. */
  email?: string;
}

export interface ValidatedCoupon {
  /** Normalized (uppercased) by the API — display this, not what was typed. */
  code: string;
  discount: number;
}

/**
 * Asks the API what a promo code is worth on this exact cart.
 *
 * The answer is a *preview*. Order creation recomputes the discount from the
 * code, so nothing here can change what the buyer is charged — which is also
 * why it is safe to call on every cart change. Throws ApiError with a
 * buyer-readable message (expired, wrong event, fully redeemed) on 422; the
 * caller shows it verbatim.
 */
export async function validateCoupon(input: ValidateCouponInput): Promise<ValidatedCoupon> {
  const { data } = await apiFetch<ValidatedCoupon>("/coupons/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Attaches the session when there is one, so a signed-in buyer's per-user
    // cap is checked here rather than surfacing at checkout.
    credentials: "include",
    body: JSON.stringify(input),
  });
  return data;
}

export interface CreateOrderInput {
  eventSlug: string;
  lines: CartLine[];
  buyer: { name: string; email: string; phone?: string };
  couponCode?: string;
  paymentProvider: PaymentProviderId;
}

/**
 * Creates the order and gets back what the browser must do to pay for it.
 *
 * Only tier ids and quantities are sent — every price, fee and discount is
 * computed server-side, so the totals shown alongside are a display of the
 * cart, never an input to the charge. The order comes back PENDING and holds
 * its inventory for a fixed window; it becomes PAID only when the gateway's
 * own callback reaches the API, which is why `payment` below is a *launch
 * instruction* and not a result.
 *
 * `credentials: "include"` attaches the session when there is one, which is
 * what links the order to the buyer's account; guests simply don't have one
 * and their order is addressed by code + email instead.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreatedOrder> {
  const { data } = await apiFetch<CreatedOrder>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return data;
}

/**
 * Re-reads an order — this is the polling call the confirmation page runs
 * while waiting for the gateway callback to flip PENDING to PAID.
 *
 * `email` is what lets a guest read their own order: the code alone is short
 * and human-readable, so the API deliberately requires the buyer email
 * alongside it (a session covers signed-in buyers instead).
 */
export async function getOrder(code: string, email?: string): Promise<Order> {
  const qs = email ? `?email=${encodeURIComponent(email)}` : "";
  const { data } = await apiFetch<Order>(`/orders/${encodeURIComponent(code)}${qs}`, {
    credentials: "include",
  });
  return data;
}

/**
 * Dev-only: drives the mock gateway's "payment succeeded" callback through the
 * real webhook pipeline. The API 404s this route in production, which is the
 * guard that matters — this function existing in the bundle grants nothing.
 * Returns 202: the order flips to PAID asynchronously, so callers still poll.
 */
export async function confirmMockOrder(code: string): Promise<void> {
  await apiFetch<{ accepted: boolean }>(`/orders/${encodeURIComponent(code)}/confirm-mock`, {
    method: "POST",
    credentials: "include",
  });
}
