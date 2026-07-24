"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { CheckoutShell } from "@/components/CheckoutShell";
import { AppleIcon, CardIcon, CheckIcon, LockIcon, ShieldIcon } from "@/components/Icons";
import { money } from "@/lib/format";

function formatCard(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function PaymentStep() {
  const router = useRouter();
  const { totals, placeOrder } = useCheckout();
  const [card, setCard] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const isFree = totals.total === 0;

  function pay(quick = false) {
    if (!quick && !isFree) {
      const digits = card.replace(/\D/g, "");
      if (digits.length < 15) return setError("Enter a valid card number.");
      if (exp.length < 5) return setError("Enter the card expiry (MM/YY).");
      if (cvc.length < 3) return setError("Enter the security code.");
      if (name.trim().length < 2) return setError("Enter the name on the card.");
    }
    setError("");
    setProcessing(true);
    setTimeout(() => {
      const order = placeOrder();
      if (order) router.push("/checkout/confirmation");
      else {
        setProcessing(false);
        setError("Something went wrong. Please try again.");
      }
    }, 1000);
  }

  return (
    <CheckoutShell
      step="payment"
      title={isFree ? "Confirm your order" : "Payment"}
      subtitle={isFree ? "No payment needed — just confirm to get your tickets." : "All transactions are secure and encrypted."}
    >
      <div className="max-w-md">
        {!isFree && (
          <>
            <button
              onClick={() => pay(true)}
              disabled={processing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <AppleIcon width={17} height={17} /> Pay
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or pay with card <span className="h-px flex-1 bg-line" />
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-fg">Card number</span>
                <div className="relative">
                  <CardIcon width={17} height={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={card}
                    onChange={(e) => { setCard(formatCard(e.target.value)); setError(""); }}
                    inputMode="numeric"
                    placeholder="4242 4242 4242 4242"
                    className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm text-fg tnum placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-fg">Expiry</span>
                  <input
                    value={exp}
                    onChange={(e) => { setExp(formatExpiry(e.target.value)); setError(""); }}
                    inputMode="numeric"
                    placeholder="MM/YY"
                    className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg tnum placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-fg">CVC</span>
                  <input
                    value={cvc}
                    onChange={(e) => { setCvc(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
                    inputMode="numeric"
                    placeholder="123"
                    className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg tnum placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-fg">Name on card</span>
                <input
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(""); }}
                  placeholder="ALEX MORGAN"
                  className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </label>
            </div>
          </>
        )}

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/checkout/details")}
            disabled={processing}
            className="rounded-xl border border-line px-4 py-3.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={() => pay(false)}
            disabled={processing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.99] disabled:opacity-70"
          >
            {processing ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/40 border-t-primary-fg" />
                Processing…
              </>
            ) : (
              <>
                <LockIcon width={16} height={16} />
                {isFree ? "Confirm order" : `Pay ${money(totals.total)}`}
              </>
            )}
          </button>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
          <ShieldIcon width={14} height={14} /> Demo checkout — use any numbers, no real card is charged.
        </p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-faint">
          <CheckIcon width={12} height={12} className="text-success" /> Instant delivery to your email &amp; wallet
        </p>
      </div>
    </CheckoutShell>
  );
}
