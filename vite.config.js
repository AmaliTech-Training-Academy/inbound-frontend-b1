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
        globals: true,
        setupFiles: "./src/test/setup.js",
        // Components and utils only; nothing here needs a real browser.
        include: ["src/**/*.test.{js,jsx}"],
    },
});
