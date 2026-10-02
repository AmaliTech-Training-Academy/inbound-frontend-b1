import process from "node:process";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { backendConfigError } from "./src/config.js";

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
    // Vite bakes VITE_* in at build time, so a build without a backend address
    // would ship an app with nothing to talk to. Fail here, by name, instead.
    // loadEnv reads the .env files and the process environment (a Docker
    // build arg arrives as the latter).
    if (command === "build") {
        const problem = backendConfigError(loadEnv(mode, process.cwd(), "VITE_"));
        if (problem) throw new Error(problem);
    }

    return {
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
    };
});
