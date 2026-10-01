import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Every suite asserts on console.error in at least one place, and a stray one
// elsewhere usually means a real problem, so keep the spy global rather than
// re-mocking it in each file.
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
