// The ticket quantity control. It is the only place a buyer sets how many
// tickets they are buying, so the clamps are what stop a cart the API will
// reject (or, worse, a negative quantity).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QtyStepper } from "./QtyStepper";

const decrease = () => screen.getByRole("button", { name: "Decrease" });
const increase = () => screen.getByRole("button", { name: "Increase" });

describe("QtyStepper", () => {
  it("shows the current value", () => {
    render(<QtyStepper value={3} onChange={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("steps up and down by one", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QtyStepper value={3} onChange={onChange} />);

    await user.click(increase());
    expect(onChange).toHaveBeenLastCalledWith(4);

    await user.click(decrease());
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("cannot go below zero", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QtyStepper value={0} onChange={onChange} />);

    expect(decrease()).toBeDisabled();
    await user.click(decrease());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("cannot go past the maximum", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QtyStepper value={10} onChange={onChange} max={10} />);

    expect(increase()).toBeDisabled();
    await user.click(increase());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("respects a custom maximum", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QtyStepper value={4} onChange={onChange} max={4} />);

    expect(increase()).toBeDisabled();
    await user.click(decrease());
    expect(onChange).toHaveBeenLastCalledWith(3);
  });

  // A tier that sells out while the buyer is looking at it: both directions
  // lock, so they cannot quietly keep adding to a cart that will be rejected.
  it("disables both buttons when the tier is unavailable", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QtyStepper value={2} onChange={onChange} disabled />);

    expect(decrease()).toBeDisabled();
    expect(increase()).toBeDisabled();
    await user.click(increase());
    await user.click(decrease());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("labels its buttons for screen readers rather than relying on the icons", () => {
    render(<QtyStepper value={1} onChange={vi.fn()} />);

    // The visible content is an SVG; without these names the control is two
    // unlabelled buttons.
    expect(decrease()).toBeInTheDocument();
    expect(increase()).toBeInTheDocument();
  });
});
