import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// findBy*/waitFor give up after 1s by default. Several specs wait on a real
// expiry timer plus a render, which fits easily on a laptop but not always on
// a shared CI runner, where a different one of them failed each time. A
// longer ceiling costs nothing when the UI is quick: they return as soon as it
// appears.
//
// Raised again from 5s on 2026-10-09, after the expiry specs failed a deploy
// from dev on a tree that had passed CI on its own branch minutes earlier.
// These waits are wall-clock, and so is the ceiling: when a runner deschedules
// the worker, the budget burns while the timer and the render do not get to
// run. Nothing here is slow - the ceiling only decides how much starvation a
// passing test survives, so it is kept well under vite.config.js's testTimeout
// so that a genuinely stuck wait still fails as a waitFor timeout, which names
// the condition, rather than as a bare test timeout, which does not.
configure({ asyncUtilTimeout: 10000 });

// jsdom draws nothing, and says so on console.error for every click the app's
// spark canvas answers. No context is exactly what the component handles.
HTMLCanvasElement.prototype.getContext = () => null;

// Every suite asserts on console.error in at least one place, and a stray one
// elsewhere usually means a real problem, so keep the spy global rather than
// re-mocking it in each file.
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
});
