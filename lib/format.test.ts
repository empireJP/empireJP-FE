// Display formatting. The currency tests are the ones that matter: the BE
// serializer hands over display numbers already in the event's currency
// ($45 is 45, ¥12,000 is 12000), so a blanket "/100" or a hardcoded "$" here
// silently misprices a whole market.
//
// Dates are formatted from a hand-rolled table rather than Intl, and read the
// LOCAL parts of the Date — the ISO strings the BE emits are UTC-verbatim
// Colombo wall-clock times (see the BE's event-time.ts), so these tests pass
// datetimes without a zone to avoid asserting on the runner's offset.
import { describe, expect, it } from "vitest";
import {
  amount,
  calendarParts,
  dateLong,
  dateShort,
  hashHue,
  initials,
  money,
  to12h,
} from "./format";

describe("money", () => {
  it("renders zero as Free rather than a currency amount", () => {
    expect(money(0)).toBe("Free");
    expect(money(0, "JPY")).toBe("Free");
  });

  it("defaults to USD for call sites that pass no currency", () => {
    expect(money(45)).toBe("$45");
  });

  it("keeps a zero-decimal currency whole — a ¥12,000 ticket is not ¥120", () => {
    expect(money(12_000, "JPY")).toBe("¥12,000");
  });

  it("drops the decimals entirely on a whole amount", () => {
    expect(money(45, "USD")).toBe("$45");
  });

  // BUG (pinned, not endorsed): `minimumFractionDigits: 0` applies to the
  // fractional case too, so an amount with one decimal place renders with one
  // decimal place — a $45.50 ticket shows as "$45.5". The fix is a
  // *minimum* of 2 whenever the value isn't an integer, matching the existing
  // maximum. Left as-is here because it changes what every buyer sees; this
  // test documents the current behaviour so the change is deliberate and
  // visible when someone makes it.
  it("renders a one-decimal amount without its trailing zero", () => {
    expect(money(45.5, "USD")).toBe("$45.5");
    expect(money(1234.5, "USD")).toBe("$1,234.5");
  });

  it("renders a two-decimal amount in full", () => {
    expect(money(45.55, "USD")).toBe("$45.55");
    expect(money(45.05, "USD")).toBe("$45.05");
  });

  it("groups thousands", () => {
    expect(money(3500, "USD")).toBe("$3,500");
  });

  it("formats LKR", () => {
    // en-US renders LKR with its code, not a glyph — asserted so a locale
    // change doesn't quietly alter what buyers see.
    expect(money(2500, "LKR")).toContain("2,500");
  });
});

describe("amount", () => {
  // Totals rows where "Free" reads wrong ("Discount: Free" is nonsense).
  it("always shows a number, including zero", () => {
    expect(amount(0)).toBe("$0");
    expect(amount(0, "JPY")).toBe("¥0");
  });

  it("otherwise matches money", () => {
    expect(amount(45.5, "USD")).toBe(money(45.5, "USD"));
  });
});

describe("dateShort", () => {
  it('renders "Sat, Aug 15"', () => {
    expect(dateShort("2026-08-15T18:00:00")).toBe("Sat, Aug 15");
  });

  it("does not zero-pad the day", () => {
    expect(dateShort("2026-08-05T18:00:00")).toBe("Wed, Aug 5");
  });
});

describe("dateLong", () => {
  it('renders "Saturday, August 15, 2026"', () => {
    expect(dateLong("2026-08-15T18:00:00")).toBe("Saturday, August 15, 2026");
  });
});

describe("calendarParts", () => {
  it("splits into the card's three pieces, month uppercased", () => {
    expect(calendarParts("2026-08-15T18:00:00")).toEqual({
      weekday: "Sat",
      day: "15",
      month: "AUG",
    });
  });
});

describe("to12h", () => {
  it.each([
    ["19:00", "7:00 PM"],
    ["09:30", "9:30 AM"],
    // The two that a naive `h % 12` gets wrong.
    ["00:15", "12:15 AM"],
    ["12:00", "12:00 PM"],
    ["23:59", "11:59 PM"],
  ])("converts %s to %s", (input, expected) => {
    expect(to12h(input)).toBe(expected);
  });
});

describe("initials", () => {
  it("takes the first letter of the first two words, uppercased", () => {
    expect(initials("ada lovelace")).toBe("AL");
  });

  it("ignores words past the second", () => {
    expect(initials("Ada King Lovelace")).toBe("AK");
  });

  it("strips punctuation rather than initialising it", () => {
    expect(initials("D.J. Sample")).toBe("DS");
    expect(initials("O'Brien Smith")).toBe("OS");
  });

  // Punctuation is removed before the split, so a hyphenated name becomes one
  // word and yields one letter. Pinned rather than "fixed": "AL" would need
  // the separator replaced with a space instead of deleted, and for an avatar
  // monogram a single "A" is a defensible answer — worth knowing it is the
  // answer, though.
  it("gives a hyphenated name a single initial, since the hyphen joins the words", () => {
    expect(initials("Ada-Lovelace")).toBe("A");
  });

  it("collapses extra whitespace", () => {
    expect(initials("  Ada   Lovelace  ")).toBe("AL");
  });

  it("returns an empty string when there is nothing to initialise", () => {
    expect(initials("")).toBe("");
    expect(initials("!!!")).toBe("");
  });

  it("handles a single name", () => {
    expect(initials("Prince")).toBe("P");
  });
});

describe("hashHue", () => {
  it("is deterministic — the same name always gets the same colour", () => {
    expect(hashHue("Ada Lovelace")).toBe(hashHue("Ada Lovelace"));
  });

  it("stays inside a valid hue range", () => {
    for (const name of ["", "a", "Ada Lovelace", "x".repeat(200), "日本語"]) {
      const hue = hashHue(name);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("separates different names", () => {
    expect(hashHue("Ada")).not.toBe(hashHue("Grace"));
  });
});
