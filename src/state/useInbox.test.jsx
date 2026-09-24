import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

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
import { createInbox, getInboxInfo, ApiError } from "../services/inboxApi.js";

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

// A confirmation the test settles by hand, after the user has acted.
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

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

    describe("a confirmation that lands after a local action", () => {
        it("does not resurrect an inbox the user has destroyed", async () => {
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));
            const confirm = deferred();
            getInboxInfo.mockReturnValue(confirm.promise);

            const { result } = renderHook(() => useInbox());
            act(() => result.current.destroy());

            await act(async () => {
                confirm.resolve({ expiresAt: storedInbox.expiresAt });
                await confirm.promise;
            });

            expect(result.current.status).toBe("idle");
            expect(result.current.inbox).toBeNull();
            expect(sessionStorage.getItem(KEY)).toBeNull();
        });

        it("does not clear a newly generated inbox on a stale 401", async () => {
            sessionStorage.setItem(KEY, JSON.stringify(storedInbox));
            const confirm = deferred();
            getInboxInfo.mockReturnValue(confirm.promise);
            const replacement = {
                ...storedInbox,
                id: "i2",
                address: "replacement@inbound.dev",
                token: "tok_replacement",
            };
            createInbox.mockResolvedValue(replacement);

            const { result } = renderHook(() => useInbox());
            await act(() => result.current.generate());

            await act(async () => {
                confirm.reject(new ApiError(401, "Inbox Not Found"));
                await confirm.promise.catch(() => {});
            });

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.address).toBe(replacement.address);
            expect(JSON.parse(sessionStorage.getItem(KEY)).id).toBe("i2");
        });
    });
});
