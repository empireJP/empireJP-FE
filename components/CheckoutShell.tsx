"use client";

import Link from "next/link";
import { useCheckout } from "@/lib/checkout";
import { CheckoutStepper } from "./CheckoutStepper";
import { OrderSummary } from "./OrderSummary";
import type { StepKey } from "@/lib/steps";
import { TicketIcon } from "./Icons";

export function CheckoutShell({
  step,
  title,
  subtitle,
  children,
  action,
  hideSummary = false,
  requireOrder = false,
}: {
  /** Omitted on the sign-in gate, which sits outside the numbered steps. */
  step?: StepKey;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  hideSummary?: boolean;
  requireOrder?: boolean;
}) {
  const { hydrated, event, eventLoading, order } = useCheckout();

  if (!hydrated || eventLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
        <div className="mt-8 h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  const blocked = requireOrder ? !order : !event;
  if (blocked) {
    return (
      <div className="mx-auto grid max-w-md place-items-center px-6 py-28 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-surface-2 text-muted">
          <TicketIcon width={26} height={26} />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-fg">
          Your cart is empty
        </h1>
        <p className="mt-2 text-muted">
          Pick an event to start — your tickets will show up here.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
        >
          Explore events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {step && (
        <div className="mb-8 overflow-x-auto">
          <CheckoutStepper current={step} />
        </div>
      )}

      <div
        className={
          hideSummary
            ? ""
            : "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:gap-x-8"
        }
      >
        {/* content */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
          </div>
          {children}
        </div>

        {/* order summary — on mobile it sits above the action so the total is seen first */}
        {!hideSummary && (
          <aside className="mt-8 lg:col-start-2 lg:row-span-2 lg:mt-0 lg:self-start lg:sticky lg:top-24">
            <OrderSummary />
          </aside>
        )}

        {/* primary action — last on mobile (after the summary), below content on desktop */}
        {action && (
          <div className="mt-6 lg:col-start-1 lg:row-start-2">{action}</div>
        )}
      </div>
    </div>
  );
}
