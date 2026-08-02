"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { CheckoutShell } from "@/components/CheckoutShell";
import { QtyStepper } from "@/components/QtyStepper";
import { ArrowRightIcon } from "@/components/Icons";
import { money } from "@/lib/format";

export default function TicketsStep() {
  const router = useRouter();
  const { event, lines, setQty, totals } = useCheckout();
  const { hydrated, signedIn } = useUser();

  // Checkout requires a session — deep links land on the sign-in gate first.
  useEffect(() => {
    if (hydrated && !signedIn) {
      router.replace("/checkout/signin");
    }
  }, [hydrated, signedIn, router]);

  // A cart survives in sessionStorage, so it can outlive the sale it was
  // started from. Without this the buyer walks three more steps and is
  // refused at payment, which is where the API stops them regardless.
  const closed = Boolean(event?.ended || event?.salesClosed);
  const closedReason = event?.ended
    ? "This event has already taken place."
    : "Ticket sales for this event have closed.";

  return (
    <CheckoutShell
      step="tickets"
      title="Select tickets"
      subtitle={event ? `${event.title} · ${event.venue}` : undefined}
      action={
        <div className="flex items-center justify-between gap-4">
          <p className={`text-sm ${closed ? "text-warning" : "text-muted"}`}>
            {closed
              ? closedReason
              : totals.count === 0
                ? "Add at least one ticket to continue."
                : `${totals.count} ticket${totals.count > 1 ? "s" : ""} · ${money(totals.total, event?.currency)} total`}
          </p>
          <button
            onClick={() => router.push("/checkout/details")}
            disabled={totals.count === 0 || closed}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
            <ArrowRightIcon width={16} height={16} />
          </button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="divide-y divide-line">
          {event?.tiers.map((t) => {
            const qty = lines[t.id] ?? 0;
            const max = Math.min(t.available, 8);
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-4 px-4 py-4 sm:px-5 ${
                  t.soldOut ? "opacity-55" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-fg">{t.name}</span>
                    {t.badge && !t.soldOut && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{t.blurb}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-semibold text-fg">
                      {t.soldOut ? "Sold out" : money(t.price, event?.currency)}
                    </span>
                    {!t.soldOut && t.available <= 24 && (
                      <span className="ml-2 text-warning">{t.available} left</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0">
                  {t.soldOut ? (
                    <span className="text-sm font-medium text-faint">—</span>
                  ) : (
                    <QtyStepper value={qty} onChange={(v) => setQty(t.id, v)} max={max} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CheckoutShell>
  );
}
