import { describe, it, expect } from "vitest";
import { splitSocketTarget } from "./config.js";

describe("config", () => {
    describe("splitSocketTarget", () => {
        it("keeps the default mount point when the base has no prefix", () => {
            expect(splitSocketTarget("http://localhost:9001")).toEqual({
                origin: "http://localhost:9001",
                path: "/socket.io",
            });
        });

        it("moves a path prefix out of the origin and into the mount point", () => {
            // The deployment serves everything under /server. Left in the URL,
            // socket.io would read "/server" as a namespace and never connect.
            expect(
                splitSocketTarget("https://54.73.161.140.nip.io/server"),
            ).toEqual({
                origin: "https://54.73.161.140.nip.io",
                path: "/server/socket.io",
            });
        });

        it("tolerates a trailing slash on the prefix", () => {
            expect(splitSocketTarget("https://example.test/server/")).toEqual({
                origin: "https://example.test",
                path: "/server/socket.io",
            });
        });

        it("handles a nested prefix", () => {
            expect(splitSocketTarget("https://example.test/a/b")).toEqual({
                origin: "https://example.test",
                path: "/a/b/socket.io",
            });
        });

        it("falls back to same-origin defaults for an unparseable base", () => {
            expect(splitSocketTarget("not a url")).toEqual({
                origin: undefined,
                path: "/socket.io",
            });
        });
    });
});
