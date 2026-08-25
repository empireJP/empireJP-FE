// The client-side mirror of the BE's request schemas. These tests pin the
// rules that docs/CLIENT_VALIDATION_AUDIT.md records field by field, so a
// LIMITS edit that drifts from the BE fails here instead of surfacing as a 422
// on the payment step.
//
// The most important test in this file is the validateBuyer/buyerIsComplete
// equivalence one — see its comment.
import { describe, expect, it } from "vitest";
import {
  LIMITS,
  buyerIsComplete,
  cartLinesError,
  collect,
  email,
  hasErrors,
  optionalText,
  requiredText,
  validateBuyer,
  validateCouponCode,
  validateProfile,
} from "./validation";

describe("requiredText", () => {
  it("rejects an empty or whitespace-only value", () => {
    expect(requiredText("", "Name", 10)).toBe("Name is required.");
    expect(requiredText("   ", "Name", 10)).toBe("Name is required.");
  });

  it("measures length after trimming, so surrounding spaces don't cost the buyer characters", () => {
    expect(requiredText(`  ${"a".repeat(10)}  `, "Name", 10)).toBeNull();
  });

  it("rejects one character over the limit and names the limit", () => {
    expect(requiredText("a".repeat(11), "Name", 10)).toBe(
      "Name must be 10 characters or fewer."
    );
  });

  it("accepts a value exactly at the limit", () => {
    expect(requiredText("a".repeat(10), "Name", 10)).toBeNull();
  });
});

describe("optionalText", () => {
  // "" means "unset" (stored NULL on the BE) — an optional field that rejected
  // empty would make it impossible to clear a phone number.
  it("accepts empty, which is how a field gets cleared", () => {
    expect(optionalText("", "Mobile", 10)).toBeNull();
    expect(optionalText("   ", "Mobile", 10)).toBeNull();
  });

  it("still enforces the maximum when a value is present", () => {
    expect(optionalText("a".repeat(11), "Mobile", 10)).toBe(
      "Mobile must be 10 characters or fewer."
    );
  });
});

describe("email", () => {
  it("requires a value", () => {
    expect(email("")).toBe("Email is required.");
    expect(email("  ", "Work email")).toBe("Work email is required.");
  });

  it.each([
    "buyer@test.dev",
    "first.last+tag@sub.example.co.uk",
    // Deliberately permissive: the BE's z.email() is the authority, and a
    // stricter pattern here would reject genuinely deliverable addresses.
    "unusual!#$%&'*+-/=?^_`{|}~@example.com",
  ])("accepts %s", (value) => {
    expect(email(value)).toBeNull();
  });

  it.each(["no-at-sign", "no@domain", "two@@ats.com", "spaces in@example.com", "@example.com"])(
    "rejects %s",
    (value) => {
      expect(email(value)).toBe("Enter a valid email address.");
    }
  );

  it("rejects an address over the BE's 254-character cap", () => {
    const local = "a".repeat(250);
    expect(email(`${local}@ex.com`)).toBe(
      `Email must be ${LIMITS.buyer.email} characters or fewer.`
    );
  });
});

describe("collect / hasErrors", () => {
  it("keeps only the entries that produced a message", () => {
    expect(collect([["a", "bad"], ["b", null]])).toEqual({ a: "bad" });
  });

  it("reports emptiness", () => {
    expect(hasErrors({})).toBe(false);
    expect(hasErrors({ a: "bad" })).toBe(true);
  });
});

describe("validateProfile", () => {
  const valid = { name: "Ada Lovelace", phone: "0771234567", city: "Colombo" };

  it("accepts a complete profile", () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it("requires name and city", () => {
    const errors = validateProfile({ ...valid, name: "", city: "" });
    expect(errors.name).toBe("Name is required.");
    expect(errors.city).toBe("City is required.");
  });

  // Phone is nullable on the BE, so an empty one must not block a save.
  it("treats an empty phone as legal", () => {
    expect(validateProfile({ ...valid, phone: "" })).toEqual({});
  });

  it("bounds each field at the BE's limit", () => {
    const errors = validateProfile({
      name: "a".repeat(LIMITS.profile.name + 1),
      phone: "0".repeat(LIMITS.profile.phone + 1),
      city: "c".repeat(LIMITS.profile.city + 1),
    });
    expect(Object.keys(errors).sort()).toEqual(["city", "name", "phone"]);
  });
});

describe("validateBuyer", () => {
  const valid = { name: "Ada Lovelace", phone: "0771234567", email: "ada@test.dev" };

  it("accepts a complete buyer", () => {
    expect(validateBuyer(valid)).toEqual({});
  });

  // The BE floor is 1 character; this layer deliberately asks for 2, because a
  // single letter is never a real name on a ticket that has to match ID.
  it("rejects a single-character name with the ticket-specific message", () => {
    expect(validateBuyer({ ...valid, name: "A" }).name).toBe(
      "Please enter the name on the ticket."
    );
  });

  it("uses the same message for an empty name — it is the same problem to the buyer", () => {
    expect(validateBuyer({ ...valid, name: "" }).name).toBe(
      "Please enter the name on the ticket."
    );
  });

  it("accepts a two-character name", () => {
    expect(validateBuyer({ ...valid, name: "Al" }).name).toBeUndefined();
  });

  it("bounds a long name", () => {
    expect(validateBuyer({ ...valid, name: "a".repeat(LIMITS.buyer.name + 1) }).name).toBe(
      `Name must be ${LIMITS.buyer.name} characters or fewer.`
    );
  });

  it("treats an empty phone as legal but bounds a long one", () => {
    expect(validateBuyer({ ...valid, phone: "" }).phone).toBeUndefined();
    expect(validateBuyer({ ...valid, phone: "0".repeat(LIMITS.buyer.phone + 1) }).phone).toBe(
      `Mobile number must be ${LIMITS.buyer.phone} characters or fewer.`
    );
  });

  // The email is not an editable field here — it comes from the session — so a
  // bad one is an account problem, and the message has to say something the
  // buyer can act on rather than "enter a valid email".
  it("reports a session-shaped message for a missing or malformed email", () => {
    const expected =
      "We couldn't read the email address on your account. Sign in again and retry.";
    expect(validateBuyer({ ...valid, email: "" }).email).toBe(expected);
    expect(validateBuyer({ ...valid, email: "not-an-email" }).email).toBe(expected);
  });
});

// This is the redirect-loop guard. The details step gates on validateBuyer and
// the payment step gates on buyerIsComplete; a rule in one and not the other
// means Continue succeeds and payment bounces straight back, forever. Rather
// than assert a handful of cases twice, assert the two agree on every case.
describe("validateBuyer and buyerIsComplete agree (no redirect loop)", () => {
  const drafts = [
    { name: "Ada Lovelace", phone: "0771234567", email: "ada@test.dev" },
    { name: "Ada Lovelace", phone: "", email: "ada@test.dev" },
    { name: "", phone: "", email: "ada@test.dev" },
    { name: "A", phone: "", email: "ada@test.dev" },
    { name: "Al", phone: "", email: "ada@test.dev" },
    { name: "Ada", phone: "", email: "" },
    { name: "Ada", phone: "", email: "not-an-email" },
    { name: "a".repeat(LIMITS.buyer.name + 1), phone: "", email: "ada@test.dev" },
    { name: "Ada", phone: "0".repeat(LIMITS.buyer.phone + 1), email: "ada@test.dev" },
    { name: "   ", phone: "   ", email: "ada@test.dev" },
  ];

  it.each(drafts)("agree on %j", (draft) => {
    expect(buyerIsComplete(draft)).toBe(!hasErrors(validateBuyer(draft)));
  });

  // buyerIsComplete's phone is optional in its signature; omitting it must be
  // identical to passing "", or the payment guard would disagree with the
  // details form for every buyer who left the field blank.
  it("treats an omitted phone exactly like an empty one", () => {
    const base = { name: "Ada", email: "ada@test.dev" };
    expect(buyerIsComplete(base)).toBe(buyerIsComplete({ ...base, phone: "" }));
    expect(buyerIsComplete(base)).toBe(true);
  });
});

describe("validateCouponCode", () => {
  it("requires a code", () => {
    expect(validateCouponCode("")).toBe("Enter a promo code.");
    expect(validateCouponCode("   ")).toBe("Enter a promo code.");
  });

  it("accepts a normal code", () => {
    expect(validateCouponCode("SUMMER20")).toBeNull();
  });

  it("bounds the code at the BE's limit", () => {
    expect(validateCouponCode("A".repeat(LIMITS.coupon.code))).toBeNull();
    expect(validateCouponCode("A".repeat(LIMITS.coupon.code + 1))).toBe(
      `Promo codes are at most ${LIMITS.coupon.code} characters.`
    );
  });
});

describe("cartLinesError", () => {
  it("allows up to the distinct-tier cap", () => {
    expect(cartLinesError(LIMITS.cart.maxLines)).toBeNull();
    expect(cartLinesError(0)).toBeNull();
  });

  it("explains the cap and suggests splitting once it is exceeded", () => {
    expect(cartLinesError(LIMITS.cart.maxLines + 1)).toContain(
      `at most ${LIMITS.cart.maxLines} different ticket types`
    );
  });
});
