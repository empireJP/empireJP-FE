"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { CheckoutShell } from "@/components/CheckoutShell";
import { AppleIcon, ArrowRightIcon, MailIcon } from "@/components/Icons";

export default function SignInStep() {
  const router = useRouter();
  const { buyer, setBuyer } = useCheckout();
  const { signIn } = useUser();
  const [email, setEmail] = useState(buyer.email);
  const [error, setError] = useState("");

  function proceed(withEmail: string) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(withEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setBuyer({ email: withEmail });
    signIn(withEmail);
    router.push("/checkout/details");
  }

  return (
    <CheckoutShell
      step="signin"
      title="Sign in to continue"
      subtitle="We'll send your tickets and receipt here. No account needed."
    >
      <div className="max-w-md">
        {/* social */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => proceed("you@gmail.com")}
            className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-[13px] font-bold text-[#4285F4] shadow-sm ring-1 ring-line">
              G
            </span>
            Continue with Google
          </button>
          <button
            onClick={() => proceed("you@icloud.com")}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <AppleIcon width={17} height={17} />
            Continue with Apple
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
        </div>

        {/* email */}
        <div>
          <label className="text-sm font-medium text-fg">Email address</label>
          <div className="relative mt-1.5">
            <MailIcon
              width={17}
              height={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && proceed(email)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="mt-2 text-sm text-accent">{error}</p>}

          <button
            onClick={() => proceed(email)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Continue
            <ArrowRightIcon width={16} height={16} />
          </button>
          <p className="mt-3 text-xs text-faint">
            By continuing you agree to Empire Events&rsquo; Terms and acknowledge the
            Privacy Policy. This is a demo — no real account is created.
          </p>
        </div>
      </div>
    </CheckoutShell>
  );
}
