import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/inboxApi.js", async () => {
    const actual = await vi.importActual("../services/inboxApi.js");
    return {
        ...actual,
        createInbox: vi.fn(),
        getInboxInfo: vi.fn(),
        getSessionInboxes: vi.fn(),
        extendInbox: vi.fn(),
    };
});

import { useInbox } from "./useInbox.js";
import { MAX_INBOXES } from "../config.js";
import { createInbox, getSessionInboxes, ApiError } from "../services/inboxApi.js";

const LEGACY_KEY = "inbound.inbox";
const SESSION_KEY = "inbound.session";

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString();

const inboxA = {
    id: "a",
    address: "alpha@inbound.dev",
    createdAt: inMinutes(-1),
    expiresAt: inMinutes(9),
    extendCount: 0,
};
const inboxB = { ...inboxA, id: "b", address: "bravo@inbound.dev" };

function storeSession(overrides = {}) {
    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
            token: "tok",
            expiresAt: inMinutes(9),
            inboxes: [inboxA, inboxB],
            activeId: "a",
            hiddenIds: [],
            ...overrides,
        }),
    );
}

const stored = () => JSON.parse(sessionStorage.getItem(SESSION_KEY));

// What createInbox resolves to: the inbox, carrying the session's token.
function created(id, token = "tok") {
    return {
        id,
        address: `${id}@inbound.dev`,
        token,
        createdAt: new Date().toISOString(),
        expiresAt: inMinutes(10),
        sessionExpiresAt: inMinutes(10),
    };
}

// A server answer the test settles by hand, after the user has acted.
function deferred() {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Leave the sync hanging by default, so the restored state is what gets
    // asserted rather than the post-sync one.
    getSessionInboxes.mockReturnValue(new Promise(() => {}));
});

describe("useInbox", () => {
    describe("restoring on mount", () => {
        it("shows the stored session's active inbox on the very first render", () => {
            // A refresh must redraw the same screen, not blank it while the
            // server confirms. Anything less flashes an empty page.
            storeSession();
            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.address).toBe(inboxA.address);
            expect(result.current.inbox.token).toBe("tok");
            expect(result.current.inboxes.map((i) => i.id)).toEqual(["a", "b"]);
        });

        it("moves a single inbox stored by an earlier version into a session", () => {
            sessionStorage.setItem(
                LEGACY_KEY,
                JSON.stringify({ ...inboxA, token: "tok_legacy" }),
            );
            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.address).toBe(inboxA.address);
            expect(sessionStorage.getItem(LEGACY_KEY)).toBeNull();
            expect(stored().token).toBe("tok_legacy");
        });

        it("starts idle when nothing is stored", () => {
            const { result } = renderHook(() => useInbox());

            expect(result.current.status).toBe("idle");
            expect(result.current.inbox).toBeNull();
            expect(result.current.inboxes).toEqual([]);
        });

        it("leaves out stored inboxes that have already expired", () => {
            storeSession({
                inboxes: [{ ...inboxA, expiresAt: inMinutes(-1) }, inboxB],
            });
            const { result } = renderHook(() => useInbox());

            expect(result.current.inboxes.map((i) => i.id)).toEqual(["b"]);
            expect(result.current.inbox.id).toBe("b");
        });
    });

    describe("syncing with the server", () => {
        it("ends the session when the server says it is gone", async () => {
            storeSession();
            getSessionInboxes.mockRejectedValue(new ApiError(401, "Session Not Found"));

            const { result } = renderHook(() => useInbox());
            expect(result.current.status).toBe("active");

            await waitFor(() => expect(result.current.status).toBe("idle"));
            expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
        });

        it("keeps the inboxes when the sync fails on the network", async () => {
            // A blip must not lose anyone their addresses.
            storeSession();
            getSessionInboxes.mockRejectedValue(new ApiError(0, "Could not reach the server."));

            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(getSessionInboxes).toHaveBeenCalled());
            expect(result.current.status).toBe("active");
            expect(result.current.inboxes).toHaveLength(2);
        });

        it("adopts the server's list and filters out its expired inboxes", async () => {
            storeSession();
            getSessionInboxes.mockResolvedValue([
                { ...inboxA, expiresAt: inMinutes(4), messageCount: 2 },
                { ...inboxB, expiresAt: inMinutes(-1) },
                { ...inboxA, id: "c", address: "charlie@inbound.dev" },
            ]);

            const { result } = renderHook(() => useInbox());

            await waitFor(() =>
                expect(result.current.inboxes.map((i) => i.id)).toEqual(["a", "c"]),
            );
            expect(result.current.inbox.expiresAt).toBe(
                result.current.inboxes[0].expiresAt,
            );
        });

        it("does not bring back an inbox destroyed while it was in flight", async () => {
            storeSession();
            const answer = deferred();
            getSessionInboxes.mockReturnValue(answer.promise);

            const { result } = renderHook(() => useInbox());
            await waitFor(() => expect(getSessionInboxes).toHaveBeenCalled());
            act(() => result.current.destroy());

            await act(async () => {
                answer.resolve([inboxA, inboxB]);
                await answer.promise;
            });

            expect(result.current.inboxes.map((i) => i.id)).toEqual(["b"]);
        });

        it("keeps a destroyed inbox hidden when a later sync lists it again", async () => {
            storeSession();
            getSessionInboxes.mockResolvedValue([inboxA, inboxB]);

            const { result } = renderHook(() => useInbox());
            act(() => result.current.destroy());
            await act(async () => {
                await result.current.refresh();
            });

            expect(result.current.inboxes.map((i) => i.id)).toEqual(["b"]);
        });
    });

    describe("adding inboxes", () => {
        it("adds the new inbox to the existing session and switches to it", async () => {
            storeSession({ inboxes: [inboxA] });
            createInbox.mockResolvedValue(created("c"));

            const { result } = renderHook(() => useInbox());
            await act(() => result.current.addInbox());

            expect(createInbox).toHaveBeenCalledWith(
                expect.objectContaining({ sessionToken: "tok" }),
            );
            expect(result.current.inboxes.map((i) => i.id)).toEqual(["a", "c"]);
            expect(result.current.inbox.id).toBe("c");
            expect(result.current.status).toBe("active");
        });

        it("starts a new session when the server no longer knows this one", async () => {
            storeSession({ inboxes: [inboxA] });
            createInbox
                .mockRejectedValueOnce(new ApiError(404, "Session Not Found"))
                .mockResolvedValueOnce(created("c", "tok_new"));

            const { result } = renderHook(() => useInbox());
            await act(() => result.current.addInbox());

            expect(createInbox).toHaveBeenLastCalledWith(
                expect.not.objectContaining({ sessionToken: expect.anything() }),
            );
            expect(result.current.inboxes.map((i) => i.id)).toEqual(["c"]);
            expect(stored().token).toBe("tok_new");
        });

        it("keeps the open inbox when adding another fails", async () => {
            storeSession({ inboxes: [inboxA] });
            createInbox.mockRejectedValue(new ApiError(0, "Could not reach the server."));

            const { result } = renderHook(() => useInbox());
            await act(() => result.current.addInbox());

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.id).toBe("a");
            expect(result.current.error.message).toMatch(/could not add an inbox/i);
        });

        it(`stops at ${MAX_INBOXES} inboxes`, async () => {
            storeSession({
                inboxes: Array.from({ length: MAX_INBOXES }, (_, n) => ({
                    ...inboxA,
                    id: `i${n}`,
                })),
                activeId: "i0",
            });

            const { result } = renderHook(() => useInbox());
            expect(result.current.canAddInbox).toBe(false);
            await act(() => result.current.addInbox());

            expect(createInbox).not.toHaveBeenCalled();
        });

        it("creates the first inbox through the creating state", async () => {
            const answer = deferred();
            createInbox.mockReturnValue(answer.promise);

            const { result } = renderHook(() => useInbox());
            let pending;
            act(() => {
                pending = result.current.generate();
            });
            expect(result.current.status).toBe("creating");

            await act(async () => {
                answer.resolve(created("c"));
                await pending;
            });

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.id).toBe("c");
        });
    });

    describe("switching and destroying", () => {
        it("switches the open inbox", () => {
            storeSession();
            const { result } = renderHook(() => useInbox());

            act(() => result.current.select("b"));

            expect(result.current.inbox.id).toBe("b");
            expect(stored().activeId).toBe("b");
        });

        it("destroys only the open inbox and moves to the next", () => {
            storeSession();
            const { result } = renderHook(() => useInbox());

            act(() => result.current.destroy());

            expect(result.current.status).toBe("active");
            expect(result.current.inbox.id).toBe("b");
            expect(stored().hiddenIds).toEqual(["a"]);
        });

        it("ends the session when the last inbox is destroyed", () => {
            storeSession({ inboxes: [inboxA] });
            const { result } = renderHook(() => useInbox());

            act(() => result.current.destroy());

            expect(result.current.status).toBe("idle");
            expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
        });
    });

    describe("expiry", () => {
        it("moves to the next inbox, with a notice, when the open one runs out", async () => {
            storeSession({
                inboxes: [
                    { ...inboxA, expiresAt: new Date(Date.now() + 150).toISOString() },
                    inboxB,
                ],
            });
            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.inbox.id).toBe("b"));
            expect(result.current.notice).toBe(`${inboxA.address} expired`);
            expect(result.current.status).toBe("active");
        });

        it("shows the purged state when the last inbox runs out", async () => {
            storeSession({
                inboxes: [{ ...inboxA, expiresAt: new Date(Date.now() + 150).toISOString() }],
            });
            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.status).toBe("expired"));
            expect(result.current.inbox).toBeNull();
        });
    });

    describe("regenerate", () => {
        it("flags the request so the purged card can stay up, then clears it", async () => {
            const answer = deferred();
            createInbox.mockReturnValue(answer.promise);

            const { result } = renderHook(() => useInbox());
            let pending;
            act(() => {
                pending = result.current.regenerate();
            });

            expect(result.current.regenerating).toBe(true);
            expect(result.current.status).toBe("creating");

            await act(async () => {
                answer.resolve(created("c"));
                await pending;
            });

            expect(result.current.regenerating).toBe(false);
            expect(result.current.status).toBe("active");
        });
    });
});
