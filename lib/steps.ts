export const CHECKOUT_STEPS = [
  { key: "tickets", label: "Tickets", href: "/checkout/tickets" },
  { key: "signin", label: "Sign in", href: "/checkout/signin" },
  { key: "details", label: "Details", href: "/checkout/details" },
  { key: "payment", label: "Payment", href: "/checkout/payment" },
  { key: "confirmation", label: "Done", href: "/checkout/confirmation" },
] as const;

export type StepKey = (typeof CHECKOUT_STEPS)[number]["key"];

export function stepIndex(key: StepKey) {
  return CHECKOUT_STEPS.findIndex((s) => s.key === key);
}
