// Client-side mirrors of the BE's request schemas
// (empireJP-BE/src/modules/**/*.schemas.ts).
//
// A UX layer, never a security one — the BE validates every field again and
// stays the only authority. The point is that a buyer learns their phone
// number is too long while looking at the phone field, not two steps later
// when the order POST fails on the payment screen.
//
// Rules are duplicated rather than imported because the repos share no
// package. LIMITS is the one place to change when a BE schema moves; keep it
// in step with the appendix in docs/CLIENT_VALIDATION_AUDIT.md.

/** Field name -> message. A form is valid when this is empty. */
export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export const LIMITS = {
  profile: { name: 120, phone: 32, city: 80 },
  buyer: { name: 120, email: 254, phone: 32 },
  coupon: { code: 64 },
  cart: { maxLines: 10, maxQtyPerLine: 20 },
  /** RSVP registration on a private event — mirrors `registerRsvpSchema`
   *  (empireJP-BE `events.registrations.schemas.ts`): name trimmed 1–120, a
   *  valid email that the API lowercases. */
  rsvp: { name: 120 },
} as const;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export function requiredText(
  value: string,
  label: string,
  max: number
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > max)
    return `${label} must be ${max} characters or fewer.`;
  return null;
}

export function optionalText(
  value: string,
  label: string,
  max: number
): string | null {
  if (value.trim().length > max)
    return `${label} must be ${max} characters or fewer.`;
  return null;
}

/** Deliberately permissive — the BE's `z.email()` is the authority, and a
 *  stricter pattern would reject addresses that are genuinely valid. Same
 *  expression the sign-in pages already use. */
export function email(value: string, label = "Email"): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed))
    return "Enter a valid email address.";
  if (trimmed.length > LIMITS.buyer.email)
    return `${label} must be ${LIMITS.buyer.email} characters or fewer.`;
  return null;
}

export function collect<K extends string>(
  entries: Array<[K, string | null]>
): FieldErrors<K> {
  const out: FieldErrors<K> = {};
  for (const [key, message] of entries) if (message) out[key] = message;
  return out;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

// ---------------------------------------------------------------------------
// Account settings — PATCH /api/v1/me
// ---------------------------------------------------------------------------

export type ProfileField = "name" | "phone" | "city";

/**
 * `email` is absent on purpose: `patchMeSchema` is a non-strict object, so the
 * BE silently strips it. Email is the auth identity and cannot be changed
 * here — the field is rendered read-only rather than validated.
 */
export function validateProfile(draft: {
  name: string;
  phone: string;
  city: string;
}): FieldErrors<ProfileField> {
  const { profile } = LIMITS;
  return collect<ProfileField>([
    ["name", requiredText(draft.name, "Name", profile.name)],
    // "" is legal and means "unset" (stored NULL), so this is optional-only.
    ["phone", optionalText(draft.phone, "Mobile", profile.phone)],
    ["city", requiredText(draft.city, "City", profile.city)],
  ]);
}

// ---------------------------------------------------------------------------
// Checkout — POST /api/v1/orders
// ---------------------------------------------------------------------------

export type BuyerField = "name" | "phone" | "email";

/**
 * Must stay the exact complement of `buyerIsComplete`: the details step gates
 * on this and the payment step gates on that, so any rule in one and not the
 * other is a redirect loop — Continue succeeds, payment bounces back, forever.
 * That is why `email` is checked here even though the field isn't editable.
 */
export function validateBuyer(draft: {
  name: string;
  phone: string;
  email: string;
}): FieldErrors<BuyerField> {
  const { buyer } = LIMITS;
  return collect<BuyerField>([
    [
      "name",
      // The BE floor is 1, but a single character is never a real name on a
      // ticket that has to match ID at the door.
      draft.name.trim().length < 2
        ? "Please enter the name on the ticket."
        : requiredText(draft.name, "Name", buyer.name),
    ],
    ["phone", optionalText(draft.phone, "Mobile number", buyer.phone)],
    [
      // Comes from the session, not a field the buyer can edit — so if it is
      // missing the only honest thing to do is say so rather than let them
      // walk into a failed order.
      "email",
      email(draft.email) === null
        ? null
        : "We couldn't read the email address on your account. Sign in again and retry.",
    ],
  ]);
}

/**
 * Whether the checkout has enough to create an order — the payment step's
 * guard. Defined in terms of `validateBuyer` so the two can never drift; see
 * the note there.
 */
export function buyerIsComplete(buyer: {
  name: string;
  email: string;
  phone?: string;
}) {
  return !hasErrors(
    validateBuyer({
      name: buyer.name,
      phone: buyer.phone ?? "",
      email: buyer.email,
    })
  );
}

export function validateCouponCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return "Enter a promo code.";
  if (trimmed.length > LIMITS.coupon.code)
    return `Promo codes are at most ${LIMITS.coupon.code} characters.`;
  return null;
}

/** `cartLinesSchema` caps the array at 10 distinct tiers. Only reachable on an
 *  event with 11+ tiers, but the failure would land at order creation. */
export function cartLinesError(distinctTiers: number): string | null {
  return distinctTiers > LIMITS.cart.maxLines
    ? `An order can include at most ${LIMITS.cart.maxLines} different ticket types. Please split it into separate orders.`
    : null;
}

/**
 * RSVP registration on a private event — mirrors `registerRsvpSchema`.
 *
 * The name check earns its keep rather than leaning on HTML `required`: that
 * accepts a string of spaces, which the API then trims to `""` and rejects, so
 * without this a whitespace-only name comes back as a 422 in the generic
 * error banner with nothing pointing at the field.
 */
export function rsvpNameError(value: string): string | null {
  return requiredText(value, "Name", LIMITS.rsvp.name);
}

export function rsvpEmailError(value: string): string | null {
  return email(value);
}
