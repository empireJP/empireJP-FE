// Global test setup: jest-dom matchers, and a clean DOM/storage between tests.
//
// Nothing here mocks the API — each test that needs a response stubs `fetch`
// itself, so a test that forgets to is a loud failure rather than a silent
// pass against a shared default.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  // The checkout store persists here; a leftover cart from a previous test
  // would hydrate into the next one.
  sessionStorage.clear();
  localStorage.clear();
});
