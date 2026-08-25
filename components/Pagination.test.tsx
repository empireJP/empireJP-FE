// Pagination, whose only real logic is the ellipsis window: which page numbers
// survive when there are more pages than slots. Asserted through the rendered
// output because `pageItems` is deliberately private.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

/** The page numbers and ellipses currently on screen, in order. */
function items(): string[] {
  const nav = screen.getByRole("navigation", { name: "Pagination" });
  return [...nav.childNodes]
    .map((n) => n.textContent?.trim() ?? "")
    .filter((t) => t !== "");
}

/** Just the numbered page buttons. */
function pageNumbers(): string[] {
  return screen
    .getAllByRole("button")
    .map((b) => b.textContent?.trim() ?? "")
    .filter((t) => /^\d+$/.test(t));
}

describe("visibility", () => {
  // One page is not a choice — rendering a single "1" button is noise.
  it("renders nothing when there is only one page", () => {
    const { container } = render(<Pagination page={1} pageCount={1} onChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no pages at all", () => {
    const { container } = render(<Pagination page={1} pageCount={0} onChange={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("page list", () => {
  it("lists every page without ellipses while they fit", () => {
    render(<Pagination page={1} pageCount={7} onChange={vi.fn()} />);

    expect(pageNumbers()).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
    expect(items()).not.toContain("…");
  });

  // Past the threshold: first, last, current and its neighbours survive.
  it("collapses the middle when there are more pages than fit", () => {
    render(<Pagination page={5} pageCount={20} onChange={vi.fn()} />);

    expect(pageNumbers()).toEqual(["1", "4", "5", "6", "20"]);
    expect(items().filter((t) => t === "…")).toHaveLength(2);
  });

  it("collapses only the right side near the start", () => {
    render(<Pagination page={2} pageCount={20} onChange={vi.fn()} />);

    expect(pageNumbers()).toEqual(["1", "2", "3", "20"]);
    expect(items().filter((t) => t === "…")).toHaveLength(1);
  });

  it("collapses only the left side near the end", () => {
    render(<Pagination page={19} pageCount={20} onChange={vi.fn()} />);

    expect(pageNumbers()).toEqual(["1", "18", "19", "20"]);
    expect(items().filter((t) => t === "…")).toHaveLength(1);
  });

  // page-1 and page+1 would otherwise reach outside the real range.
  it("never lists a page below 1 or above the last", () => {
    render(<Pagination page={1} pageCount={20} onChange={vi.fn()} />);
    expect(pageNumbers()).toEqual(["1", "2", "20"]);

    render(<Pagination page={20} pageCount={20} onChange={vi.fn()} />);
    expect(pageNumbers().slice(-3)).toEqual(["1", "19", "20"]);
  });

  it("does not repeat a page that is both current and an endpoint", () => {
    render(<Pagination page={1} pageCount={10} onChange={vi.fn()} />);

    const numbers = pageNumbers();
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});

describe("navigation", () => {
  it("moves to the page that was clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={5} pageCount={20} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "6" }));

    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("steps with the previous and next arrows", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={5} pageCount={20} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChange).toHaveBeenLastCalledWith(6);

    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it("disables the arrows at each end so the page can't go out of range", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    const { unmount } = render(<Pagination page={1} pageCount={20} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    unmount();

    render(<Pagination page={20} pageCount={20} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("marks the current page for assistive tech", () => {
    render(<Pagination page={5} pageCount={20} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "4" })).not.toHaveAttribute("aria-current");
  });
});
