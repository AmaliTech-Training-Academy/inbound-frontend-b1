import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import App from "./App.jsx";
import { API_BASE, USE_MOCK } from "./config.js";

// One line on boot, so it is never a guess which backend the page is talking to.
// Vite inlines import.meta.env at startup, so changing .env needs a dev-server
// restart to take effect.
if (USE_MOCK) {
    console.info(
        "[inbound] Running against the in-memory mock backend. " +
            "Set VITE_API_BASE and drop VITE_USE_MOCK in .env to use the real server.",
    );
} else {
    console.info(`[inbound] API base: ${API_BASE}`);
}

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
