"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { CheckoutShell } from "@/components/CheckoutShell";
import { ArrowRightIcon, CheckCircleIcon } from "@/components/Icons";
import { LIMITS, hasErrors, validateBuyer } from "@/lib/validation";

export default function DetailsStep() {
  const router = useRouter();
  const { buyer, setBuyer, totals } = useCheckout();
  const { hydrated, signedIn, profile } = useUser();

  // The sign-in step is gone: the buyer email comes from the session now.
  useEffect(() => {
    if (hydrated && signedIn && profile.email && buyer.email !== profile.email) {
      setBuyer({ email: profile.email });
    }
  }, [hydrated, signedIn, profile.email, buyer.email, setBuyer]);
  const [name, setName] = useState(buyer.name);
  const [phone, setPhone] = useState(buyer.phone);
  const [validated, setValidated] = useState(false);

  // Mirrors createOrderSchema's `buyer` block, so an over-long name or phone
  // fails here rather than at order creation on the payment step — where the
  // same 422 reads as a payment problem.
  const errors = validateBuyer({ name, phone });
  const shown = validated ? errors : {};

  function proceed() {
    setValidated(true);
    if (hasErrors(errors)) return;
    setBuyer({ name: name.trim(), phone: phone.trim() });
    router.push("/checkout/payment");
  }

  return (
    <CheckoutShell
      step="details"
      title="Your details"
      subtitle="The lead booker's name appears on every ticket for entry."
    >
      <div className="max-w-md">
        {buyer.email && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm">
            <CheckCircleIcon width={18} height={18} className="text-success" />
            <span className="text-muted">
              Signed in as <span className="font-medium text-fg">{buyer.email}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Full name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setValidated(true)}
              placeholder="Alex Morgan"
              maxLength={LIMITS.buyer.name}
              aria-invalid={!!shown.name}
              className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent aria-[invalid=true]:border-danger"
            />
            {shown.name && (
              <span role="alert" className="text-xs font-medium text-danger">
                {shown.name}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">
              Mobile number <span className="text-faint">(optional)</span>
            </span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setValidated(true)}
              placeholder="(555) 123-4567"
              inputMode="tel"
              maxLength={LIMITS.buyer.phone}
              aria-invalid={!!shown.phone}
              className="rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent aria-[invalid=true]:border-danger"
            />
            {shown.phone ? (
              <span role="alert" className="text-xs font-medium text-danger">
                {shown.phone}
              </span>
            ) : (
              <span className="text-xs text-faint">
                For door updates if the event time changes.
              </span>
            )}
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => router.push("/checkout/tickets")}
            className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
          >
            Back
          </button>
          <button
            onClick={proceed}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Continue to payment{totals.count > 0 ? "" : ""}
            <ArrowRightIcon width={16} height={16} />
          </button>
        </div>
      </div>
    </CheckoutShell>
  );
}
