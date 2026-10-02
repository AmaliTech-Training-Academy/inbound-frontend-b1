import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// findBy*/waitFor give up after 1s by default. Several specs wait on a real
// expiry timer plus a render, which fits easily on a laptop but not always on
// a shared CI runner, where a different one of them failed each time. A
// longer ceiling costs nothing when the UI is quick: they return as soon as it
// appears.
configure({ asyncUtilTimeout: 5000 });

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
