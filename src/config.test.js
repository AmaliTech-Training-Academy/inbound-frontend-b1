import { describe, it, expect } from "vitest";
import { splitSocketTarget } from "./config.js";

describe("config", () => {
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

        it("falls back to same-origin defaults for an unparseable base", () => {
            expect(splitSocketTarget("not a url")).toEqual({
                origin: undefined,
                path: "/socket.io",
            });
        });
    });
});
