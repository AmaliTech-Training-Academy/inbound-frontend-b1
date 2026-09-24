import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/inboxApi.js", async () => {
    const actual = await vi.importActual("../services/inboxApi.js");
    return {
        ...actual,
        createInbox: vi.fn(),
        getInboxInfo: vi.fn(),
        extendInbox: vi.fn(),
    };
});

import { useInbox } from "./useInbox.js";
import { getInboxInfo, ApiError } from "../services/inboxApi.js";

const KEY = "inbound.inbox";

const storedInbox = {
    id: "i1",
    address: "restored@inbound.dev",
    token: "tok_restored",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 9 * 60_000).toISOString(),
};

beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Leave the confirmation hanging by default so the first render is what
    // gets asserted, not the post-confirmation state.
    getInboxInfo.mockReturnValue(new Promise(() => {}));
});

describe("useInbox", () => {
    describe("restoring on mount", () => {
        it("shows the stored inbox on the very first render", () => {
            // A refresh must redraw the same screen, not blank it while the
            // server confirms. Anything less flashes an empty page.
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));

            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.address).toBe(storedInbox.address);
        });

        it("never passes through a loading state", () => {
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));
            const seen = [];

            renderHook(() => {
                const v = useInbox();
                seen.push(v.status);
                return v;
            });

            expect(seen).not.toContain("loading");
        });

        it("starts idle when nothing is stored", () => {
            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("idle");
            expect(result.current.inbox).toBeNull();
            expect(getInboxInfo).not.toHaveBeenCalled();
        });

        it("ignores a stored inbox that has already expired", () => {
            sessionStorage.setItem(
                KEY,
                JSON.stringify({
                    ...storedInbox,
                    expiresAt: new Date(Date.now() - 1000).toISOString(),
                }),
            );

            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("idle");
            expect(result.current.inbox).toBeNull();
        });
    });

    describe("confirming with the server", () => {
        it("tears the inbox down when the server says it is gone", async () => {
            // The optimistic render must still self-correct, or a dead inbox
            // would sit on screen indefinitely.
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));
            getInboxInfo.mockRejectedValue(new ApiError(401, "Inbox Not Found"));

            const { result } = renderHook(() => useInbox());
            expect(result.current.status).toBe("active");

            await waitFor(() => expect(result.current.status).toBe("idle"));
            expect(sessionStorage.getItem(KEY)).toBeNull();
        });

        it("keeps the inbox when the confirmation fails on the network", async () => {
            // A blip must not lose the user's address.
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));
            getInboxInfo.mockRejectedValue(
                new ApiError(0, "Could not reach the server."),
            );

            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(getInboxInfo).toHaveBeenCalled());
            expect(result.current.status).toBe("active");
            expect(result.current.inbox.address).toBe(storedInbox.address);
        });
    });
});
