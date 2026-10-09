import { useCallback, useEffect, useState } from "react";

// The theme, as a class on <html>. Light is the default rather than the OS
// preference, so a visitor who never touches the toggle gets the theme the
// product shipped with. The class is set in two places and read in none:
// index.html applies it before the first paint, and this hook keeps it true.
const STORAGE_KEY = "inbound-theme";

// Two toggles on screen must not disagree. Today there is only ever one, but
// the nav and the inbox header are one shared layout away from both showing.
const THEME_EVENT = "inbound:theme";

function readStored() {
    try {
        return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light";
    } catch (e) {
        console.error("Failed to read theme from localStorage:", e);
        return "light";
    }
}

export function useTheme() {
    const [theme, setTheme] = useState(readStored);

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (e) {
            console.error("Failed to save theme to localStorage:", e);
        }
        window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
    }, [theme]);

    useEffect(() => {
        const onTheme = (event) => setTheme(event.detail);
        window.addEventListener(THEME_EVENT, onTheme);
        return () => window.removeEventListener(THEME_EVENT, onTheme);
    }, []);

    const toggle = useCallback(
        () => setTheme((current) => (current === "dark" ? "light" : "dark")),
        [],
    );

    return { theme, toggle, isDark: theme === "dark" };
}
