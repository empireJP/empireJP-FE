// The checkout step order. Small, but the stepper renders progress from
// stepIndex and the guards compare positions, so a reordering or a renamed key
// changes navigation behaviour rather than just a label.
import { describe, expect, it } from "vitest";
import { CHECKOUT_STEPS, stepIndex, type StepKey } from "./steps";

describe("CHECKOUT_STEPS", () => {
  it("runs tickets -> details -> payment -> confirmation", () => {
    expect(CHECKOUT_STEPS.map((s) => s.key)).toEqual([
      "tickets",
      "details",
      "payment",
      "confirmation",
    ]);
  });

  it("points each step at its own route", () => {
    for (const step of CHECKOUT_STEPS) {
      expect(step.href).toBe(`/checkout/${step.key}`);
    }
  });

  it("gives every step a label to render", () => {
    for (const step of CHECKOUT_STEPS) {
      expect(step.label).toBeTruthy();
    }
  });
});

describe("stepIndex", () => {
  it.each([
    ["tickets", 0],
    ["details", 1],
    ["payment", 2],
    ["confirmation", 3],
  ] as [StepKey, number][])("places %s at %i", (key, expected) => {
    expect(stepIndex(key)).toBe(expected);
  });

  it("orders the steps so a progress comparison works", () => {
    expect(stepIndex("tickets")).toBeLessThan(stepIndex("details"));
    expect(stepIndex("details")).toBeLessThan(stepIndex("payment"));
    expect(stepIndex("payment")).toBeLessThan(stepIndex("confirmation"));
  });
});
