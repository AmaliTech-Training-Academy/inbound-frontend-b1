import { describe, it, expect, vi } from "vitest";
import { backendConfigError, splitSocketTarget, MAX_INBOXES } from "./config.js";

describe("config", () => {
    it("caps a session at five inboxes unless VITE_MAX_INBOXES says otherwise", () => {
        expect(MAX_INBOXES).toBe(5);
    });

    describe("backendConfigError", () => {
        it("refuses settings with neither a backend nor the mock", () => {
            expect(backendConfigError({})).toMatch(/VITE_API_BASE is not set/);
            expect(backendConfigError({ VITE_API_BASE: "", VITE_USE_MOCK: "false" })).toMatch(
                /VITE_USE_MOCK=true/,
            );
        });

        it("accepts a backend address", () => {
            expect(
                backendConfigError({ VITE_API_BASE: "https://host.test/server/api/v1" }),
            ).toBeNull();
        });

        it("accepts the mock, but only when asked for by name", () => {
            expect(backendConfigError({ VITE_USE_MOCK: "true" })).toBeNull();
        });
    });

    describe("splitSocketTarget", () => {
        it("moves a deployment prefix into the socket path", () => {
            // io("https://host/server") would ask for namespace "/server".
            expect(
                splitSocketTarget("https://host.test/server/api/v1"),
            ).toEqual({ origin: "https://host.test", path: "/server/socket.io" });
        });

        it("uses the default path when the API has no prefix", () => {
            expect(splitSocketTarget("http://localhost:9001/api/v1")).toEqual({
                origin: "http://localhost:9001",
                path: "/socket.io",
            });
        });

        it("tolerates a trailing slash", () => {
            expect(
                splitSocketTarget("https://host.test/server/api/v1/"),
            ).toEqual({ origin: "https://host.test", path: "/server/socket.io" });
        });

        it("falls back to same-origin defaults for an unparseable base, and says so", () => {
            const reported = vi.spyOn(console, "error").mockImplementation(() => {});

            try {
                expect(splitSocketTarget("not a url")).toEqual({
                    origin: undefined,
                    path: "/socket.io",
                });
                // Silence here leaves the socket pointing somewhere else, which
                // surfaces only as mail never arriving.
                expect(reported).toHaveBeenCalledWith(
                    expect.stringContaining("not a url"),
                    expect.anything(),
                );
            } finally {
                reported.mockRestore();
            }
        });
    });
});
