"use client";

import { useState } from "react";
import { useCheckout } from "@/lib/checkout";
import { EventCover } from "./EventCover";
import { CalendarIcon, CheckIcon, LockIcon, PinIcon, XIcon } from "./Icons";
import { amount, dateShort, money, to12h } from "@/lib/format";
import { validateCouponCode } from "@/lib/validation";

export function OrderSummary() {
  const { event, lines, totals, coupon, applyCoupon, removeCoupon } = useCheckout();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  if (!event) return null;
  const active = event.tiers.filter((t) => (lines[t.id] ?? 0) > 0);
  // Every amount in this panel is denominated in the event's currency.
  const ccy = event.currency;

  // Applying is a round trip now — the API owns every coupon rule, so this
  // can't be answered locally.
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checking) return;
    // validateCouponSchema is `trim().min(1).max(64)`. Checked before the
    // request rather than after: a code that can't be valid shouldn't cost a
    // round trip, and an untouched field used to submit an empty string and
    // come back as a generic failure.
    const shapeError = validateCouponCode(code);
    if (shapeError) {
      setError(shapeError);
      return;
    }
    setChecking(true);
    try {
      const res = await applyCoupon(code.trim());
      if (res.ok) {
        setError("");
        setCode("");
      } else {
        setError(res.error ?? "");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
      {/* premium cover tile */}
      <div className="relative aspect-square w-full">
        <EventCover
          src={event.image}
          alt={event.title}
          accent={event.accent}
          className="absolute inset-0"
          rounded="rounded-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-base font-bold leading-tight text-white">{event.title}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/85">
            <CalendarIcon width={13} height={13} />
            {dateShort(event.date)} · {to12h(event.startTime)}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-white/70">
            <PinIcon width={13} height={13} />
            {event.venue} · {event.city}
          </p>
        </div>
      </div>

      {/* line items */}
      <div className="px-4 py-3">
        {active.length === 0 ? (
          <p className="py-2 text-center text-sm text-faint">No tickets selected yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {active.map((t) => {
              const qty = lines[t.id];
              return (
                <div key={t.id} className="flex items-baseline justify-between text-sm">
                  <span className="text-muted">
                    {t.name} <span className="text-faint">× {qty}</span>
                  </span>
                  <span className="tnum font-medium text-fg">{money(t.price * qty, ccy)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* coupon */}
      {totals.count > 0 && (
        <div className="border-t border-line px-4 py-3">
          {coupon ? (
            // An applied code can stop applying as the cart changes (a
            // targeted tier removed, the minimum spend no longer met), so this
            // row reports which of the two it currently is.
            <div
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                totals.couponError ? "bg-danger-soft" : "bg-success-soft"
              }`}
            >
              <span
                className={`flex items-center gap-1.5 font-semibold ${
                  totals.couponError ? "text-danger" : "text-success"
                }`}
              >
                {!totals.couponError && <CheckIcon width={15} height={15} />}
                {totals.couponLabel}
              </span>
              <button
                onClick={removeCoupon}
                aria-label="Remove coupon"
                className={`grid h-5 w-5 place-items-center rounded-full transition-colors ${
                  totals.couponError
                    ? "text-danger/80 hover:bg-danger/15 hover:text-danger"
                    : "text-success/80 hover:bg-success/15 hover:text-success"
                }`}
              >
                <XIcon width={14} height={14} />
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex gap-2">
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                disabled={checking}
                placeholder="Promo code"
                aria-invalid={!!error}
                aria-describedby={error ? "coupon-error" : undefined}
                className="w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm uppercase text-fg placeholder:normal-case placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60 aria-[invalid=true]:border-danger"
              />
              <button
                type="submit"
                disabled={checking || !code.trim()}
                className="shrink-0 rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checking ? "Checking…" : "Apply"}
              </button>
            </form>
          )}
          {/* The API's reason, whether it was rejected on apply or stopped
              applying afterwards — or our own shape check, which never gets
              that far. */}
          {(error || totals.couponError) && (
            <p
              id="coupon-error"
              role="alert"
              className="mt-1.5 text-xs text-danger"
            >
              {error || totals.couponError}
            </p>
          )}
        </div>
      )}

      {/* totals */}
      {totals.count > 0 && (
        <div className="border-t border-line px-4 py-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <span className="tnum">{amount(totals.subtotal, ccy)}</span>
          </div>
          {/* No service-fee row: the buyer pays the ticket price as shown. The
              platform commission is deducted from the organizer's payout at
              settlement, so it never reaches the buyer's totals. */}
          {totals.discount > 0 && (
            <div className="mt-1 flex justify-between font-medium text-success">
              <span>Discount</span>
              <span className="tnum">−{amount(totals.discount, ccy)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-base font-semibold text-fg">
            <span>Total</span>
            <span className="tnum">{money(totals.total, ccy)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 border-t border-line bg-surface-2 px-4 py-2.5 text-xs text-muted">
        <LockIcon width={13} height={13} /> Secure, encrypted checkout
      </div>
    </div>
  );
}
