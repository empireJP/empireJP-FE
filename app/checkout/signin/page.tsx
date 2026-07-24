"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckout } from "@/lib/checkout";
import { useUser } from "@/lib/user";
import { authClient } from "@/lib/auth-client";
import { CheckoutShell } from "@/components/CheckoutShell";
import { ArrowRightIcon, GoogleIcon, MailIcon } from "@/components/Icons";

export default function SignInStep() {
  const router = useRouter();
  const { buyer, setBuyer } = useCheckout();
  const { signedIn, profile, hydrated } = useUser();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState(buyer.email);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (e.g. returning from the Google redirect) — carry the
  // account email into the checkout and skip straight to details.
  useEffect(() => {
    if (hydrated && signedIn && profile.email) {
      setBuyer({ email: profile.email });
      router.replace("/checkout/details");
    }
  }, [hydrated, signedIn, profile.email, setBuyer, router]);

  async function signInWithGoogle() {
    setError("");
    setBusy(true);
    // Full-page redirect to Google; better-auth lands back on this step,
    // which then forwards to details with the account email applied.
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/checkout/signin`,
    });
    if (err) {
      setError(err.message || "Google sign-in is unavailable right now.");
      setBusy(false);
    }
  }

  async function sendOtp(withEmail: string) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(withEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setBusy(true);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email: withEmail,
      type: "sign-in",
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Couldn't send the code. Try again.");
      return;
    }
    setOtp("");
    setStep("otp");
  }

  async function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setError("");
    setBusy(true);
    const { error: err } = await authClient.signIn.emailOtp({ email, otp });
    setBusy(false);
    if (err) {
      setError(err.message || "That code didn't work. Try again.");
      return;
    }
    setBuyer({ email });
    router.push("/checkout/details");
  }

  return (
    <CheckoutShell
      step="signin"
      title="Sign in to continue"
      subtitle="We'll send your tickets and receipt here."
    >
      <div className="max-w-md">
        {step === "email" ? (
          <>
            {/* social */}
            <div className="flex flex-col gap-2.5">
              <button
                onClick={signInWithGoogle}
                disabled={busy}
                className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover disabled:opacity-60"
              >
                <GoogleIcon width={18} height={18} />
                Continue with Google
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-line" /> or use email{" "}
              <span className="h-px flex-1 bg-line" />
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
                  onKeyDown={(e) => e.key === "Enter" && sendOtp(email)}
                  placeholder="you@email.com"
                  className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              {error && <p className="mt-2 text-sm text-accent">{error}</p>}

              <button
                onClick={() => sendOtp(email)}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Sending code…" : "Continue"}
                {!busy && <ArrowRightIcon width={16} height={16} />}
              </button>
              <p className="mt-3 text-xs text-faint">
                By continuing you agree to Empire Events&rsquo; Terms and
                acknowledge the Privacy Policy.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-fg">{email}</span>. It expires
              in 5 minutes.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
              placeholder="000000"
              autoFocus
              className="mt-4 w-full rounded-xl border border-line bg-surface py-3 text-center text-lg font-semibold tracking-[0.5em] text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
            {error && <p className="mt-2 text-sm text-accent">{error}</p>}

            <button
              onClick={verifyOtp}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Verifying…" : "Verify and continue"}
              {!busy && <ArrowRightIcon width={16} height={16} />}
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <button
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-muted hover:text-fg"
              >
                Use a different email
              </button>
              <button
                onClick={() => sendOtp(email)}
                disabled={busy}
                className="text-muted hover:text-fg disabled:opacity-60"
              >
                Resend code
              </button>
            </div>
          </>
        )}
      </div>
    </CheckoutShell>
  );
}
