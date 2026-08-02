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
// buyers who have it, and its slot is worth holding. There is no Apple Pay
// merchant flow yet, so the button is inert and says "Coming soon" — it used
// to quietly settle through the test provider, which is a thing no storefront
// button should do once real money is in play elsewhere on the page.
//
// Demo gateways never appear as a choice. The API still offers the test
// provider outside production, but a buyer must not be able to pick a method
// that completes without charging anything; `visibleMethods` is the one filter
// that enforces it.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { CheckoutShell } from "@/components/CheckoutShell";
import { AppleIcon, CardIcon, CheckIcon, LockIcon, ShieldIcon } from "@/components/Icons";
import { money } from "@/lib/format";
import { confirmMockOrder, getPaymentMethods } from "@/lib/api";
import { startPayHerePayment } from "@/lib/payhere";
import { startRedirectPayment } from "@/lib/gateway-redirect";
import { createLogger } from "@/lib/logger";
import type { PaymentMethod, PaymentProviderId } from "@/lib/types";

const log = createLogger("checkout.payment");

/** The provider a free order settles through. Nothing is charged, so no real
 *  gateway is involved — the order still has to become a real, PAID order
 *  server-side, and this is the provider that does that without a payment
 *  page. Not offered as a choice anywhere; see `visibleMethods`. */
const FREE_ORDER_VIA: PaymentProviderId = "mock";

export default function PaymentStep() {
  const router = useRouter();
  const { event, totals, buyer, placeOrder, awaitPaidOrder } = useCheckout();

  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [selected, setSelected] = useState<PaymentProviderId | null>(null);
  const [status, setStatus] = useState<"idle" | "creating" | "paying" | "confirming">("idle");
  const [error, setError] = useState("");

  const isFree = totals.total === 0;
  const busy = status !== "idle";
  // Everything on this page is denominated in the event's currency.
  const currency = event?.currency;

  // Which gateways this server can run FOR THIS EVENT'S CURRENCY — a JPY
  // event offers KOMOJU, a USD one PayHere. An empty list is a legitimate
  // answer (a currency whose gateway isn't signed yet) and renders as an
  // explanation, not a crash.
  useEffect(() => {
    let stale = false;
    getPaymentMethods(currency)
      .then((list) => {
        if (stale) return;
        setMethods(list);
        // Only real gateways are selectable, so the default is simply the
        // first one — there is no longer a demo entry to skip past.
        const real = list.filter((m) => !m.demo);
        setSelected(real[0]?.id ?? null);
        if (list.length === 0) {
          log.error("no payment methods for this event's currency", { currency });
        } else if (real.length === 0) {
          // The buyer sees "no payment methods available", which is true but
          // reads like a currency with no gateway signed. It isn't: the server
          // offered only the test provider, which this page refuses to show.
          // Almost always a deployment missing its gateway credentials.
          log.error("only demo payment methods on offer — nothing a buyer can pick", {
            currency,
            offered: list.map((m) => m.id).join(","),
          });
        }
      })
      .catch((err) => {
        if (stale) return;
        setMethods([]);
        // Without this the buyer sees an empty payment step that looks like a
        // design, not a failure.
        log.error("could not load payment methods", {
          currency,
          cause: err instanceof Error ? err.message : String(err),
        });
        setError("We couldn't load the payment options. Please refresh and try again.");
      });
    return () => {
      stale = true;
    };
  }, [currency]);

  // The list a buyer may actually choose from. `null` still means "loading" —
  // an empty array after filtering is a real answer and renders as one.
  const visibleMethods = methods?.filter((m) => !m.demo) ?? null;

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
        if (order.payment?.kind === "redirect") {
          // Hosted-page gateway (KOMOJU): the buyer leaves this site and comes
          // back to the confirmation page, which polls. Nothing more happens
          // here — the page is about to unload.
          setStatus("paying");
          startRedirectPayment(order.payment, order.code);
          return;
        }
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
            {/* Apple Pay — the express lane's slot, held but not yet wired to
                a merchant flow. Inert on purpose: it used to settle through
                the test provider, and a wallet button that completes an order
                without taking money is worse than one that plainly says it
                isn't ready. */}
            <button
              type="button"
              disabled
              aria-describedby="apple-pay-status"
              title="Apple Pay isn't available on this site yet"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white opacity-40"
            >
              <AppleIcon width={17} height={17} /> Pay
            </button>
            <p id="apple-pay-status" className="mt-1.5 text-center text-xs text-faint">
              Coming soon
            </p>

            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or choose a payment method
              <span className="h-px flex-1 bg-line" />
            </div>

            {visibleMethods === null && (
              <div className="flex flex-col gap-2.5" aria-busy="true">
                <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
                <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
              </div>
            )}

            {visibleMethods?.length === 0 && (
              <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
                No payment methods are available right now. Please try again shortly.
              </p>
            )}

            <div className="flex flex-col gap-2.5">
              {visibleMethods?.map((method) => (
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
                      {(method.id === "payhere" || method.id === "komoju") && (
                        <CardIcon width={16} height={16} className="text-faint" />
                      )}
                      {method.label}
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
            {selected === "komoju" && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-faint">
                <LockIcon width={13} height={13} className="mt-0.5 shrink-0" />
                You&rsquo;ll be taken to KOMOJU&rsquo;s secure page to pay, then brought back here
                — your details never reach this site.
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
              const provider = isFree ? FREE_ORDER_VIA : selected;
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
                {isFree ? "Confirm order" : `Pay ${money(totals.total, currency)}`}
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
