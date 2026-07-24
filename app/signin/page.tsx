"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { authClient } from "@/lib/auth-client";
import { ArrowRightIcon, GoogleIcon, MailIcon } from "@/components/Icons";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signInWithGoogle() {
    setError("");
    setBusy(true);
    // Full-page redirect to Google; better-auth lands back on the homepage.
    const { error: err } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/`,
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
    router.push("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* logo — overlaid on the artwork */}
      <div className="absolute left-5 top-5 z-20 sm:left-8 sm:top-6">
        <Logo />
      </div>

      {/* image — banner on mobile, full-height left panel on desktop */}
      <div className="relative h-64 shrink-0 overflow-hidden sm:h-72 lg:h-auto lg:w-1/2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/signin.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_25%] lg:object-center"
        />
        {/* top scrim keeps the logo legible */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />
        {/* blend into the form column on desktop */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-transparent via-transparent to-black/40 lg:block" />
        {/* blend into the form area below on mobile */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent lg:hidden" />
      </div>

      {/* sign in */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div className="animate-fade-up w-full max-w-sm">
          {step === "email" ? (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-fg">
                Welcome to Empire Events
              </h1>
              <p className="mt-2 text-muted">
                Sign in to see your tickets and saved events.
              </p>

              <div className="mt-8 flex flex-col gap-2.5">
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
                <span className="h-px flex-1 bg-line" /> or{" "}
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="relative">
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
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}

              <button
                onClick={() => sendOtp(email)}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Sending code…" : "Continue"}
                {!busy && <ArrowRightIcon width={16} height={16} />}
              </button>

              <p className="mt-6 text-xs leading-relaxed text-faint">
                By continuing you agree to our{" "}
                <a href="/terms" className="text-muted hover:text-fg">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-muted hover:text-fg">
                  Privacy Policy
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight text-fg">
                Check your email
              </h1>
              <p className="mt-2 text-muted">
                We sent a 6-digit code to{" "}
                <span className="font-semibold text-fg">{email}</span>. It
                expires in 5 minutes.
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
                className="mt-8 w-full rounded-xl border border-line bg-surface py-3 text-center text-lg font-semibold tracking-[0.5em] text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {error && <p className="mt-2 text-sm text-danger">{error}</p>}

              <button
                onClick={verifyOtp}
                disabled={busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Verify and sign in"}
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
      </div>
    </div>
  );
}
