import { describe, it, expect, vi, afterEach } from "vitest";

// A build made without VITE_API_BASE and without the mock: the client must
// refuse, by name, before anything goes over the network.
vi.mock("../config.js", async () => {
    const actual = await vi.importActual("../config.js");
    return {
        ...actual,
        USE_MOCK: false,
        API_BASE: "",
        CONFIG_ERROR: actual.backendConfigError({}),
    };
});

vi.spyOn(console, "error").mockImplementation(() => {});

const { createInbox, getSessionInboxes, NotConfiguredError } = await import("./inboxApi.js");

describe("inboxApi without a backend address", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("refuses every call without sending a request", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await expect(createInbox()).rejects.toBeInstanceOf(NotConfiguredError);
        await expect(getSessionInboxes("token")).rejects.toThrow(/VITE_API_BASE is not set/);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
