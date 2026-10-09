import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Vitest transforms test files through esbuild rather than the react
    // plugin, so the automatic JSX runtime has to be requested explicitly or
    // .jsx tests fail with "React is not defined".
    esbuild: { jsx: "automatic" },
    test: {
        // Pinned so the suite is hermetic. Without this a developer's .env
        // leaks in and inboxApi.test.js silently hits a real server instead
        // of the mock, passing or failing on whatever is running locally.
        env: { VITE_API_BASE: "", VITE_WS_BASE: "", VITE_USE_MOCK: "true" },
        environment: "jsdom",
        // Builds the jsdom environment once per worker instead of once per
        // file, keeping per-file isolation either way. The suite spent about
        // 70% of its time constructing 29 of them; this takes the run from
        // ~54s to ~19s. That matters beyond the wait: the expiry specs wait on
        // real timers, so the less work a runner is doing around them, the
        // less chance it deschedules the worker mid-wait.
        pool: "vmThreads",
        // The app-level specs drive a whole session (create, live mail,
        // switching) and take a second or two on a laptop; on a busy CI
        // runner the default 5s per test was not always enough.
        //
        // Kept comfortably above the asyncUtilTimeout in src/test/setup.js, so
        // a wait that never resolves is reported by waitFor - which says which
        // condition it was waiting on - instead of by this, which does not.
        testTimeout: 30000,
        globals: true,
        // Both layouts are in use: the co-located src/** suites and the
        // reader's own tests/ directory. Dropping either include silently
        // stops that half of the suite from running at all.
        setupFiles: ["./src/test/setup.js", "./tests/setup.js"],
        include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}"],
        // The unit tests live in their own PR; without this `npm test` here
        // exits non-zero with "no test files found".
        passWithNoTests: true,
    },
});
