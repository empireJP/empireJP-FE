"use client";

// The payment step. Three things happen here, in this order:
//
//   1. Ask the API which gateways it can actually run (GET /payments/methods).
//      The list is server-owned: a deployment without PayHere credentials must
//      not offer "Card / Bank", and the instant-completing test method must
//      never appear in production.
//   2. Create the order (POST /orders). This prices the cart server-side and
//      reserves inventory. It does NOT take money.
//   3. Hand the buyer to the gateway, then poll until its server-to-server
//      callback marks the order PAID. The popup's own "completed" event is
//      only a hint that it's worth looking — see lib/payhere.ts.
//
// Apple Pay stays where it was, at the top: it is the fastest path for the
// buyers who have it. It is not a PayHere method, so until a real Apple Pay
// merchant flow exists it runs through the test provider and is labelled as a
// demo — visible and honest beats removed or silently fake.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { CheckoutShell } from "@/components/CheckoutShell";
import { AppleIcon, CardIcon, CheckIcon, LockIcon, ShieldIcon } from "@/components/Icons";
import { money } from "@/lib/format";
import { confirmMockOrder, getPaymentMethods } from "@/lib/api";
import { startPayHerePayment } from "@/lib/payhere";
import { createLogger } from "@/lib/logger";
import type { PaymentMethod, PaymentProviderId } from "@/lib/types";

const log = createLogger("checkout.payment");

/** Apple Pay is rendered from here rather than from the API list: it is a
 *  wallet button, not one of the API's gateways, and it keeps its own
 *  presentation. `via` names the provider that actually settles it. */
const APPLE_PAY_VIA: PaymentProviderId = "mock";

export default function PaymentStep() {
  const router = useRouter();
  const { totals, buyer, placeOrder, awaitPaidOrder } = useCheckout();

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [selected, setSelected] = useState<PaymentProviderId | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "confirming">("idle");
  const [error, setError] = useState("");

  const isFree = totals.total === 0;
  const busy = status !== "idle";

  // Which gateways this server can run. An empty list is a legitimate answer
  // (nothing configured) and renders as an explanation, not a crash.
  useEffect(() => {
    let stale = false;
    getPaymentMethods()
      .then((list) => {
        if (stale) return;
        setMethods(list);
        // Default to the first real (non-demo) method so the common case takes
        // no clicks; fall back to whatever exists.
        setSelected(list.find((m) => !m.demo)?.id ?? list[0]?.id ?? null);
        if (list.length === 0) {
          log.error("the API offers no payment methods — checkout cannot complete");
        }
      })
      .catch((err) => {
        if (stale) return;
        setMethods([]);
        // Without this the buyer sees an empty payment step that looks like a
        // design, not a failure.
        log.error("could not load payment methods", {
          cause: err instanceof Error ? err.message : String(err),
        });
        setError("We couldn't load the payment options. Please refresh and try again.");
      });
    return () => {
      stale = true;
    };
  }, []);

  const mockAvailable = methods?.some((m) => m.id === APPLE_PAY_VIA) ?? false;

  /**
   * The whole payment run for one attempt: create the order, settle it with
   * the chosen provider, then wait for the server to agree that it's paid.
   *
   * Every exit that leaves the buyer on this page sets an explanatory message
   * — an abandoned popup and a declined card are different things and should
   * not read the same.
   */
  const pay = useCallback(
    async (provider: PaymentProviderId) => {
      setError("");
      setStatus("creating");

      let order;
      try {
        order = await placeOrder(provider);
      } catch (err) {
        setStatus("idle");
        const message = err instanceof Error ? err.message : String(err);
        log.error("could not create the order", { provider, cause: message });
        // The API's messages are written for buyers (sold out, coupon expired,
        // method unavailable), so they're worth showing rather than replacing
        // with something generic.
        setError(message || "We couldn't start your order. Please try again.");
        return;
      }

      try {
        if (order.payment) {
          setStatus("paying");
          const outcome = await startPayHerePayment(order.payment, order.code);
          if (outcome.result === "dismissed") {
            setStatus("idle");
            // No charge, and the order keeps its inventory hold — so this is a
            // note, not an error.
            setError("Payment cancelled. Your tickets are still held — try again when ready.");
            return;
          }
          if (outcome.result === "error") {
            setStatus("idle");
            setError(outcome.message || "The payment couldn't be completed. Please try again.");
            return;
          }
        } else if (provider === "mock") {
          // No hosted page: drive the test gateway's callback ourselves. The
          // API 404s this route in production.
          setStatus("paying");
          await confirmMockOrder(order.code);
        }
      } catch (err) {
        setStatus("idle");
        const message = err instanceof Error ? err.message : String(err);
        log.error("payment could not be started", { code: order.code, provider, cause: message });
        setError(message || "We couldn't reach the payment provider. Please try again.");
        return;
      }

      // The order is only PAID once the gateway's own callback reaches the
      // API. Poll for it rather than assuming.
      setStatus("confirming");
      const paid = await awaitPaidOrder(order);
      // Either way the buyer goes to the confirmation page: it keeps polling
      // and shows a "still processing" state, which is the honest answer for a
      // payment whose callback is merely slow.
      if (!paid) {
        log.warn("moving to confirmation while the order is still pending", { code: order.code });
      }
      router.push("/checkout/confirmation");
    },
    [placeOrder, awaitPaidOrder, router],
  );

  const busyLabel =
    status === "creating"
      ? "Reserving your tickets…"
      : status === "paying"
        ? "Waiting for payment…"
        : "Confirming payment…";

  return (
    <CheckoutShell
      step="payment"
      title={isFree ? "Confirm your order" : "Payment"}
      subtitle={
        isFree
          ? "No payment needed — just confirm to get your tickets."
          : "All transactions are secure and encrypted."
      }
    >
      <div className="max-w-md">
        {!isFree && (
          <>
            {/* Apple Pay — the express lane, kept above the method list. */}
            <button
              onClick={() => pay(APPLE_PAY_VIA)}
              disabled={busy || !mockAvailable}
              title={mockAvailable ? undefined : "Apple Pay isn't available yet on this site"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <AppleIcon width={17} height={17} /> Pay
            </button>
            {mockAvailable && (
              <p className="mt-1.5 text-center text-xs text-faint">
                Demo — completes instantly without charging a card.
              </p>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or choose a payment method
              <span className="h-px flex-1 bg-line" />
            </div>

            {methods === null && (
              <div className="flex flex-col gap-2.5" aria-busy="true">
                <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
                <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
              </div>
            )}

            {methods?.length === 0 && (
              <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
                No payment methods are available right now. Please try again shortly.
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {methods?.map((method) => (
                <label
                  key={method.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors ${
                    selected === method.id
                      ? "border-accent bg-surface-2"
                      : "border-line hover:bg-surface-hover"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={method.id}
                    checked={selected === method.id}
                    onChange={() => {
                      setSelected(method.id);
                      setError("");
                    }}
                    disabled={busy}
                    className="mt-1 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      {method.id === "payhere" && (
                        <CardIcon width={16} height={16} className="text-faint" />
                      )}
                      {method.label}
                      {method.demo && (
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-faint">
                          Demo
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">{method.blurb}</span>
                  </span>
                </label>
              ))}
            </div>

            {selected === "payhere" && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-faint">
                <LockIcon width={13} height={13} className="mt-0.5 shrink-0" />
                Your card details are entered on PayHere&rsquo;s secure form and never reach this
                site.
              </p>
            )}
          </>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/checkout/details")}
            disabled={busy}
            className="rounded-xl border border-line px-4 py-3.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={() => {
              // A free order still becomes a real order server-side; it just
              // needs a provider that settles without a payment page.
              const provider = isFree ? APPLE_PAY_VIA : selected;
              if (!provider) {
                setError("Pick a payment method to continue.");
                return;
              }
              void pay(provider);
            }}
            disabled={busy || (!isFree && !selected)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-70"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/40 border-t-primary-fg" />
                {busyLabel}
              </>
            ) : (
              <>
                <LockIcon width={16} height={16} />
                {isFree ? "Confirm order" : `Pay ${money(totals.total)}`}
              </>
            )}
          </button>
        </div>

        {/* The buyer is about to be asked for a card — say plainly whether it
            will be charged. */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-faint">
          <ShieldIcon width={14} height={14} className="shrink-0" />
          {buyer.email
            ? `Tickets and receipt go to ${buyer.email}`
            : "Secure payment — your details are encrypted"}
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-faint">
          <CheckIcon width={12} height={12} className="text-success" /> Instant delivery to your
          email &amp; wallet
        </p>
      </div>
    </CheckoutShell>
  );
}
