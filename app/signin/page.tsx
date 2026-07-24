"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useUser } from "@/lib/user";
import { AppleIcon, ArrowRightIcon, GoogleIcon, MailIcon } from "@/components/Icons";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useUser();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function go(withEmail: string) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(withEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    signIn(withEmail);
    router.push("/account");
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
          <h1 className="text-3xl font-bold tracking-tight text-fg">
            Welcome to Empire Events
          </h1>
          <p className="mt-2 text-muted">Sign in to see your tickets and saved events.</p>

          <div className="mt-8 flex flex-col gap-2.5">
            <button
              onClick={() => go("you@gmail.com")}
              className="flex items-center justify-center gap-2.5 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-fg transition-colors hover:bg-surface-hover"
            >
              <GoogleIcon width={18} height={18} />
              Continue with Google
            </button>
            <button
              onClick={() => go("you@icloud.com")}
              className="flex items-center justify-center gap-2.5 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white ring-1 ring-line transition-opacity hover:opacity-90"
            >
              <AppleIcon width={17} height={17} /> Continue with Apple
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
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
              onKeyDown={(e) => e.key === "Enter" && go(email)}
              placeholder="you@email.com"
              className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-3 text-sm text-fg placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}

          <button
            onClick={() => go(email)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-fg transition-all hover:bg-primary-hover active:scale-[0.98]"
          >
            Continue <ArrowRightIcon width={16} height={16} />
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
        </div>
      </div>
    </div>
  );
}
