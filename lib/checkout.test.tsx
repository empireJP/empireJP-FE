// The checkout store: cart quantities, totals, coupon lifecycle and the order
// polling loop.
//
// The money assertions are the point. Totals here are a *preview* — the API
// reprices everything from its own catalog — but a preview that reads LOWER
// than what the buyer is actually charged is the one direction that must never
// happen, which is what the discount clamp exists for.
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const getEvent = vi.fn();
const validateCoupon = vi.fn();
const createOrder = vi.fn();
const getOrder = vi.fn();

// ApiError is a real class the store type-checks against with `instanceof`, so
// the mock re-exports the genuine one rather than a stand-in.
vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ApiError: actual.ApiError,
    getEvent,
    validateCoupon,
    createOrder,
    getOrder,
  };
});

const { ApiError } = await import("./api");
const { CheckoutProvider, useCheckout } = await import("./checkout");

const TIERS = [
  { id: "ga", name: "General", price: 45, currency: "USD" },
  { id: "vip", name: "VIP", price: 120, currency: "USD" },
];

function event(over: Record<string, unknown> = {}) {
  return { slug: "neon-nights", title: "Neon Nights", currency: "USD", tiers: TIERS, ...over };
}

function wrapper({ children }: { children: ReactNode }) {
  return <CheckoutProvider>{children}</CheckoutProvider>;
}

/** Mounts the store and waits for hydration + the event fetch to settle. */
async function mountCheckout(slug = "neon-nights") {
  const view = renderHook(() => useCheckout(), { wrapper });
  await waitFor(() => expect(view.result.current.hydrated).toBe(true));
  act(() => view.result.current.startCheckout(slug));
  await waitFor(() => expect(view.result.current.event).not.toBeNull());
  return view;
}

beforeEach(() => {
  getEvent.mockReset().mockResolvedValue(event());
  validateCoupon.mockReset();
  createOrder.mockReset();
  getOrder.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cart quantities", () => {
  it("starts empty", async () => {
    const { result } = await mountCheckout();

    expect(result.current.totals).toMatchObject({ count: 0, subtotal: 0, total: 0 });
  });

  it("counts tickets and sums the subtotal across tiers", async () => {
    const { result } = await mountCheckout();

    act(() => result.current.setQty("ga", 2));
    act(() => result.current.setQty("vip", 1));

    expect(result.current.totals).toMatchObject({ count: 3, subtotal: 210, total: 210 });
  });

  // A zero-quantity line is removed rather than stored as 0, so the API never
  // receives a line it would reject.
  it("removes a line set to zero or below", async () => {
    const { result } = await mountCheckout();

    act(() => result.current.setQty("ga", 2));
    act(() => result.current.setQty("ga", 0));

    expect(result.current.lines).toEqual({});
    expect(result.current.totals.count).toBe(0);
  });

  it("ignores a tier that is not on the event", async () => {
    const { result } = await mountCheckout();

    act(() => result.current.setQty("no-such-tier", 3));

    // Stored, but it contributes nothing — totals only walk the event's tiers.
    expect(result.current.totals).toMatchObject({ count: 0, subtotal: 0 });
  });

  it("startCheckout can seed an initial cart", async () => {
    const view = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(view.result.current.hydrated).toBe(true));

    act(() => view.result.current.startCheckout("neon-nights", { ga: 2 }));
    await waitFor(() => expect(view.result.current.event).not.toBeNull());

    expect(view.result.current.totals).toMatchObject({ count: 2, subtotal: 90 });
  });

  it("startCheckout on a new event clears the previous cart", async () => {
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 2));

    act(() => result.current.startCheckout("other-event"));
    await waitFor(() => expect(result.current.event).not.toBeNull());

    expect(result.current.lines).toEqual({});
  });
});

describe("coupons", () => {
  it("applies a valid code and stores the API's normalized version", async () => {
    validateCoupon.mockResolvedValue({ code: "SUMMER20", discount: 18 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 2));

    // Typed lowercase with padding; the API's normalized answer is what sticks.
    await act(async () => {
      await result.current.applyCoupon("  summer20 ");
    });

    expect(result.current.totals.couponLabel).toBe("SUMMER20");
    expect(result.current.totals.discount).toBe(18);
    expect(result.current.totals.total).toBe(72);
  });

  it("uppercases and trims the code before sending it", async () => {
    validateCoupon.mockResolvedValue({ code: "SUMMER20", discount: 5 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));

    await act(async () => {
      await result.current.applyCoupon("  summer20 ");
    });

    expect(validateCoupon).toHaveBeenCalledWith(expect.objectContaining({ code: "SUMMER20" }));
  });

  it("refuses an empty code without calling the API", async () => {
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));

    let outcome: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.applyCoupon("   ");
    });

    expect(outcome).toEqual({ ok: false, error: "Enter a code." });
    expect(validateCoupon).not.toHaveBeenCalled();
  });

  it("refuses to apply a code to an empty cart", async () => {
    const { result } = await mountCheckout();

    let outcome: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.applyCoupon("SUMMER20");
    });

    expect(outcome).toEqual({ ok: false, error: "Add a ticket first." });
    expect(validateCoupon).not.toHaveBeenCalled();
  });

  // The API knows which of a dozen rules failed; repeating a generic message
  // here would throw that away.
  it("surfaces the API's own rejection reason verbatim", async () => {
    validateCoupon.mockRejectedValue(
      new ApiError(422, "COUPON_MIN_SPEND", "Spend $100 to use this code.")
    );
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));

    let outcome: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.applyCoupon("SUMMER20");
    });

    expect(outcome).toEqual({ ok: false, error: "Spend $100 to use this code." });
    expect(result.current.totals.couponLabel).toBeNull();
    expect(result.current.totals.discount).toBe(0);
  });

  it("falls back to a generic message for a non-API failure", async () => {
    validateCoupon.mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));

    let outcome: { ok: boolean; error?: string } | undefined;
    await act(async () => {
      outcome = await result.current.applyCoupon("SUMMER20");
    });

    expect(outcome?.error).toBe("We couldn't check that code. Try again.");
  });

  it("removeCoupon clears both the code and its discount", async () => {
    validateCoupon.mockResolvedValue({ code: "SUMMER20", discount: 18 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 2));
    await act(async () => {
      await result.current.applyCoupon("SUMMER20");
    });

    act(() => result.current.removeCoupon());

    expect(result.current.totals.couponLabel).toBeNull();
    expect(result.current.totals.discount).toBe(0);
    expect(result.current.totals.total).toBe(90);
  });

  // THE money test. The coupon state can lag the cart by a render — the buyer
  // drops a ticket before the revalidation lands — and a total below what the
  // API will charge is the one direction that must never happen.
  it("clamps a stale discount to the subtotal so the total never goes negative", async () => {
    validateCoupon.mockResolvedValue({ code: "BIG", discount: 500 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1)); // $45 subtotal

    await act(async () => {
      await result.current.applyCoupon("BIG");
    });

    expect(result.current.totals.discount).toBe(45);
    expect(result.current.totals.total).toBe(0);
  });

  it("re-prices an applied coupon when the cart changes", async () => {
    validateCoupon.mockResolvedValue({ code: "PCT10", discount: 4.5 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    await act(async () => {
      await result.current.applyCoupon("PCT10");
    });

    validateCoupon.mockResolvedValue({ code: "PCT10", discount: 9 });
    await act(async () => {
      result.current.setQty("ga", 2);
    });

    await waitFor(() => expect(result.current.totals.discount).toBe(9));
    expect(result.current.totals.total).toBe(81);
  });

  // A code that was valid when applied and isn't now — the buyer removed the
  // tier it targeted, or it was disabled while they shopped.
  it("drops the discount and records why when a re-check fails", async () => {
    validateCoupon.mockResolvedValue({ code: "VIPONLY", discount: 20 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("vip", 1));
    await act(async () => {
      await result.current.applyCoupon("VIPONLY");
    });

    validateCoupon.mockRejectedValue(
      new ApiError(422, "COUPON_TIER", "That code only applies to VIP tickets.")
    );
    await act(async () => {
      result.current.setQty("ga", 1);
      result.current.setQty("vip", 0);
    });

    await waitFor(() =>
      expect(result.current.totals.couponError).toBe("That code only applies to VIP tickets.")
    );
    // The code is still shown (in its rejected state) but is worth nothing.
    expect(result.current.totals.couponLabel).toBe("VIPONLY");
    expect(result.current.totals.discount).toBe(0);
    expect(result.current.totals.total).toBe(45);
  });
});

describe("placeOrder", () => {
  const created = {
    code: "EMP-0001",
    status: "PENDING",
    paymentProvider: "payhere",
    buyerEmail: "ada@test.dev",
  };

  it("sends tier ids and quantities only — never prices", async () => {
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 2));
    act(() => result.current.setBuyer({ name: "Ada", email: "ada@test.dev" }));

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        eventSlug: "neon-nights",
        lines: [{ tierId: "ga", qty: 2 }],
      })
    );
  });

  it("refuses an empty cart", async () => {
    const { result } = await mountCheckout();

    await expect(result.current.placeOrder("payhere")).rejects.toThrow("Your cart is empty.");
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("falls back to 'Guest' when no name was captured", async () => {
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    act(() => result.current.setBuyer({ email: "ada@test.dev" }));

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ buyer: { name: "Guest", email: "ada@test.dev" } })
    );
  });

  it("omits an empty phone rather than sending a blank string", async () => {
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    act(() => result.current.setBuyer({ name: "Ada", email: "ada@test.dev", phone: "" }));

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    expect(createOrder.mock.calls[0][0].buyer).not.toHaveProperty("phone");
  });

  it("sends an applied, still-valid coupon", async () => {
    validateCoupon.mockResolvedValue({ code: "SUMMER20", discount: 9 });
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    await act(async () => {
      await result.current.applyCoupon("SUMMER20");
    });

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ couponCode: "SUMMER20" })
    );
  });

  // Sending a code the API has already rejected would fail the whole checkout
  // over a discount the buyer can see is worth nothing.
  it("drops a coupon the API has since rejected instead of failing the order", async () => {
    validateCoupon.mockResolvedValue({ code: "VIPONLY", discount: 20 });
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("vip", 1));
    await act(async () => {
      await result.current.applyCoupon("VIPONLY");
    });

    validateCoupon.mockRejectedValue(new ApiError(422, "COUPON_TIER", "VIP only."));
    await act(async () => {
      result.current.setQty("ga", 1);
      result.current.setQty("vip", 0);
    });
    await waitFor(() => expect(result.current.totals.couponError).toBe("VIP only."));

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    expect(createOrder.mock.calls[0][0]).not.toHaveProperty("couponCode");
  });

  // A redirect-style gateway navigates away in the same tick, before React's
  // persist effect runs — without the synchronous write the buyer comes back
  // from the hosted page to an empty cart.
  it("persists the order synchronously, before any redirect can happen", async () => {
    createOrder.mockResolvedValue(created);
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    act(() => result.current.setBuyer({ name: "Ada", email: "ada@test.dev" }));

    await act(async () => {
      await result.current.placeOrder("payhere");
    });

    const persisted = JSON.parse(sessionStorage.getItem("pulse-checkout-v1")!);
    expect(persisted.order.code).toBe("EMP-0001");
  });
});

describe("awaitPaidOrder", () => {
  const ref = { code: "EMP-0001", buyerEmail: "ada@test.dev" };

  it("resolves as soon as the order reads PAID", async () => {
    getOrder.mockResolvedValue({ code: "EMP-0001", status: "PAID" });
    const { result } = await mountCheckout();

    let paid: unknown;
    await act(async () => {
      paid = await result.current.awaitPaidOrder(ref);
    });

    expect(paid).toMatchObject({ status: "PAID" });
    expect(getOrder).toHaveBeenCalledTimes(1);
  });

  // A terminal non-PAID status will never become PAID — stop rather than spin
  // for the full 90-second window.
  it("stops early on a terminal non-PAID status", async () => {
    getOrder.mockResolvedValue({ code: "EMP-0001", status: "EXPIRED" });
    const { result } = await mountCheckout();

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.awaitPaidOrder(ref);
    });

    expect(outcome).toMatchObject({ status: "EXPIRED" });
    expect(getOrder).toHaveBeenCalledTimes(1);
  });

  it("keeps polling while the order is still PENDING", async () => {
    getOrder
      .mockResolvedValueOnce({ code: "EMP-0001", status: "PENDING" })
      .mockResolvedValueOnce({ code: "EMP-0001", status: "PENDING" })
      .mockResolvedValue({ code: "EMP-0001", status: "PAID" });
    const { result } = await mountCheckout();

    let paid: unknown;
    await act(async () => {
      paid = await result.current.awaitPaidOrder(ref);
    });

    expect(paid).toMatchObject({ status: "PAID" });
    expect(getOrder).toHaveBeenCalledTimes(3);
  }, 15_000);

  // Not a failure: a delayed callback still arrives and the seats are still
  // held. The confirmation page says so.
  it("resolves null when nothing lands inside the timeout", async () => {
    getOrder.mockResolvedValue({ code: "EMP-0001", status: "PENDING" });
    const { result } = await mountCheckout();

    let outcome: unknown = "unset";
    await act(async () => {
      // A short window keeps the test fast; the production default is 90s.
      outcome = await result.current.awaitPaidOrder(ref, { timeoutMs: 100 });
    });

    expect(outcome).toBeNull();
  });

  it("survives a failed poll rather than rejecting", async () => {
    getOrder
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue({ code: "EMP-0001", status: "PAID" });
    const { result } = await mountCheckout();

    let paid: unknown;
    await act(async () => {
      paid = await result.current.awaitPaidOrder(ref);
    });

    expect(paid).toMatchObject({ status: "PAID" });
  }, 15_000);
});

describe("persistence", () => {
  it("restores a cart from sessionStorage on mount", async () => {
    sessionStorage.setItem(
      "pulse-checkout-v1",
      JSON.stringify({
        eventSlug: "neon-nights",
        lines: { ga: 2 },
        buyer: { email: "ada@test.dev", name: "Ada", phone: "" },
        coupon: null,
        order: null,
      })
    );

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    await waitFor(() => expect(result.current.event).not.toBeNull());

    expect(result.current.totals).toMatchObject({ count: 2, subtotal: 90 });
    expect(result.current.buyer.email).toBe("ada@test.dev");
  });

  // Private-mode / corrupt storage must not take the checkout down with it.
  it("starts empty rather than throwing when stored state is unreadable", async () => {
    sessionStorage.setItem("pulse-checkout-v1", "{ not json");

    const { result } = renderHook(() => useCheckout(), { wrapper });

    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.lines).toEqual({});
  });

  it("reset clears the cart and any applied coupon", async () => {
    validateCoupon.mockResolvedValue({ code: "SUMMER20", discount: 9 });
    const { result } = await mountCheckout();
    act(() => result.current.setQty("ga", 1));
    await act(async () => {
      await result.current.applyCoupon("SUMMER20");
    });

    act(() => result.current.reset());

    expect(result.current.lines).toEqual({});
    expect(result.current.eventSlug).toBeNull();
    expect(result.current.totals).toMatchObject({ count: 0, discount: 0, couponLabel: null });
  });
});

describe("event resolution", () => {
  it("leaves the event null when the slug no longer resolves", async () => {
    getEvent.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.startCheckout("deleted-event"));

    await waitFor(() => expect(result.current.eventLoading).toBe(false));
    expect(result.current.event).toBeNull();
  });

  it("leaves the event null when the lookup fails outright", async () => {
    getEvent.mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useCheckout(), { wrapper });
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    act(() => result.current.startCheckout("neon-nights"));

    await waitFor(() => expect(result.current.eventLoading).toBe(false));
    expect(result.current.event).toBeNull();
  });
});

describe("useCheckout outside its provider", () => {
  it("throws a message naming the missing provider", () => {
    // React logs the thrown error; silence it so the output stays readable.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useCheckout())).toThrow(
      "useCheckout must be used within CheckoutProvider"
    );

    spy.mockRestore();
  });
});
