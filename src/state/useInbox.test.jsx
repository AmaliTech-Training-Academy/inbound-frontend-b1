import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/inboxApi.js", async () => {
    const actual = await vi.importActual("../services/inboxApi.js");
    return {
        ...actual,
        createInbox: vi.fn(),
        getInboxInfo: vi.fn(),
        getSessionInboxes: vi.fn(),
        extendInbox: vi.fn(),
        deleteInbox: vi.fn(),
        rateLimitedFor: vi.fn(() => 0),
    };
});

import { useInbox } from "./useInbox.js";
import { createInbox, deleteInbox, extendInbox, getSessionInboxes, rateLimitedFor, ApiError } from "../services/inboxApi.js";
import { MAX_INBOXES } from "../config.js";

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
    // destroy() deletes server-side now; the happy path is the default so
    // tests that only care about the local effect do not each restate it.
    deleteInbox.mockResolvedValue({ deletedMessages: 0, deletedAttachments: 0 });
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

            // "ended", not "idle": the page explains it rather than quietly
            // dropping the user on the landing page.
            await waitFor(() => expect(result.current.status).toBe("ended"));
            expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
        });

        it("calls a session that outlived its time expired", async () => {
            storeSession();
            getSessionInboxes.mockRejectedValue(new ApiError(410, "Session Expired"));

            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.status).toBe("expired"));
        });

        describe("sparing the request budget", () => {
            // Shared, per IP: 100 requests per 15 minutes across the whole API.
            const setVisibility = (state) =>
                Object.defineProperty(document, "visibilityState", { value: state, configurable: true });

            afterEach(() => {
                setVisibility("visible");
                rateLimitedFor.mockReturnValue(0);
            });

            it("leaves the list alone while the tab is hidden, and catches up on return", async () => {
                setVisibility("hidden");
                storeSession();
                getSessionInboxes.mockResolvedValue([]);

                renderHook(() => useInbox());
                await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
                expect(getSessionInboxes).not.toHaveBeenCalled();

                setVisibility("visible");
                await act(async () => {
                    document.dispatchEvent(new Event("visibilitychange"));
                });

                await waitFor(() => expect(getSessionInboxes).toHaveBeenCalledTimes(1));
            });

            it("asks nothing while the server has the client backing off", async () => {
                rateLimitedFor.mockReturnValue(60_000);
                storeSession();

                const { result } = renderHook(() => useInbox());
                await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

                expect(getSessionInboxes).not.toHaveBeenCalled();
                // Backing off costs nothing on screen.
                expect(result.current.inboxes).toHaveLength(2);
            });
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

        it("keeps the rail's order whatever order the server lists in", async () => {
            // A just-added inbox sat at the bottom, then jumped when the next
            // sync adopted the server's order.
            storeSession();
            getSessionInboxes.mockResolvedValue([
                { ...inboxA, id: "c", address: "charlie@inbound.dev", createdAt: inMinutes(-0.5) },
                inboxB,
                { ...inboxA, id: "d", address: "delta@inbound.dev", createdAt: inMinutes(-0.8) },
                inboxA,
            ]);

            const { result } = renderHook(() => useInbox());

            // a and b where they were; the unseen ones after, oldest first.
            await waitFor(() =>
                expect(result.current.inboxes.map((i) => i.id)).toEqual(["a", "b", "d", "c"]),
            );
        });

        it("does not bring back an inbox destroyed while it was in flight", async () => {
            storeSession();
            const answer = deferred();
            getSessionInboxes.mockReturnValue(answer.promise);

            const { result } = renderHook(() => useInbox());
            await waitFor(() => expect(getSessionInboxes).toHaveBeenCalled());
            await act(async () => {
                await result.current.destroy();
            });

            await act(async () => {
                answer.resolve([inboxA, inboxB]);
                await answer.promise;
            });

            expect(result.current.inboxes.map((i) => i.id)).toEqual(["b"]);
        });

        it("keeps a destroyed inbox hidden after a reload", async () => {
            // The server lists a destroyed inbox until its TTL, so its id has
            // to outlive every prune - a reload prunes before the first sync.
            storeSession();
            const first = renderHook(() => useInbox());
            await act(async () => {
                await first.result.current.destroy();
            });
            first.unmount();

            getSessionInboxes.mockResolvedValue([inboxA, inboxB]);
            const { result } = renderHook(() => useInbox());
            await waitFor(() => expect(getSessionInboxes).toHaveBeenCalled());
            await act(async () => {});

            expect(result.current.inboxes.map((i) => i.id)).toEqual(["b"]);
            expect(result.current.notice).toBeNull();
        });

        it("keeps a destroyed inbox hidden when a later sync lists it again", async () => {
            storeSession();
            getSessionInboxes.mockResolvedValue([inboxA, inboxB]);

            const { result } = renderHook(() => useInbox());
            await act(async () => {
                await result.current.destroy();
            });
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

        it("stops at the session's inbox cap without asking the server", async () => {
            const full = Array.from({ length: MAX_INBOXES }, (_, i) => ({
                ...inboxA,
                id: `full-${i}`,
                address: `full-${i}@inbound.dev`,
            }));
            storeSession({ inboxes: full, activeId: "full-0" });

            const { result } = renderHook(() => useInbox());
            expect(result.current.canAddInbox).toBe(false);
            expect(result.current.atInboxLimit).toBe(true);
            expect(result.current.maxInboxes).toBe(MAX_INBOXES);

            let added;
            await act(async () => {
                added = await result.current.addInbox();
            });

            expect(added).toBeNull();
            expect(createInbox).not.toHaveBeenCalled();
            expect(result.current.inboxes).toHaveLength(MAX_INBOXES);
            expect(result.current.error?.message).toBe(
                `This session already holds ${MAX_INBOXES} inboxes, the most it can.`,
            );
        });

        it("keeps the session, and says why, when the server refuses an add", async () => {
            // A refusal is the server saying no to this session. Starting a
            // fresh session instead would dodge its cap and strand the inboxes.
            storeSession({ inboxes: [inboxA] });
            createInbox.mockRejectedValue(new ApiError(403, "Inbox limit reached for this session"));

            const { result } = renderHook(() => useInbox());
            await act(() => result.current.addInbox());

            expect(createInbox).toHaveBeenCalledTimes(1);
            expect(stored().token).toBe("tok");
            expect(result.current.inboxes.map((i) => i.id)).toEqual(["a"]);
            expect(result.current.error?.message).toBe("Inbox limit reached for this session");
        });

        it.each([
            [404, "Session Not Found"],
            [401, "Session Not Found"],
            [410, "Session Expired"],
        ])("starts a new session when the server answers %i (%s)", async (status, message) => {
            storeSession({ inboxes: [inboxA] });
            createInbox
                .mockRejectedValueOnce(new ApiError(status, message))
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

        it("destroys only the open inbox and moves to the next", async () => {
            deleteInbox.mockResolvedValue({ id: "a", deletedMessages: 0, deletedAttachments: 0 });
            storeSession();
            const { result } = renderHook(() => useInbox());

            await act(async () => {
                await result.current.destroy();
            });

            expect(deleteInbox).toHaveBeenCalledWith("a", "tok");
            expect(result.current.status).toBe("active");
            expect(result.current.inbox.id).toBe("b");
            expect(stored().hiddenIds).toEqual(["a"]);
            expect(stored().inboxes.map((entry) => entry.id)).toEqual(["b"]);
        });

        it("ends the session when the last inbox is destroyed", async () => {
            deleteInbox.mockResolvedValue({ id: "a", deletedMessages: 0, deletedAttachments: 0 });
            storeSession({ inboxes: [inboxA] });
            const { result } = renderHook(() => useInbox());

            await act(async () => {
                await result.current.destroy();
            });

            expect(result.current.status).toBe("idle");
            expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
        });

        // The button says the inbox is destroyed. If the request failed the
        // address is still alive and still taking mail, so it has to stay on
        // screen - the alternative is telling the user something untrue.
        it("keeps the inbox when the server could not delete it, and says so", async () => {
            deleteInbox.mockRejectedValue(new ApiError(500, "Unable to delete inbox"));
            storeSession();
            const { result } = renderHook(() => useInbox());

            await act(async () => {
                await result.current.destroy();
            });

            expect(result.current.inbox.id).toBe("a");
            expect(stored().hiddenIds).toEqual([]);
            expect(result.current.error?.message).toMatch(/Could not destroy/);
        });

        // Already gone is the outcome that was asked for.
        it("treats a 404 as destroyed", async () => {
            deleteInbox.mockRejectedValue(new ApiError(404, "Inbox Not Found"));
            storeSession();
            const { result } = renderHook(() => useInbox());

            await act(async () => {
                await result.current.destroy();
            });

            expect(result.current.inbox.id).toBe("b");
            expect(result.current.error).toBeNull();
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
            expect(result.current.notice).toEqual({
                addresses: [inboxA.address],
                switched: true,
            });
            expect(result.current.status).toBe("active");
        });

        it("says so when an inbox that is not open runs out, and stays put", async () => {
            storeSession({
                inboxes: [
                    inboxA,
                    { ...inboxB, expiresAt: new Date(Date.now() + 150).toISOString() },
                ],
            });
            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.inboxes).toHaveLength(1));
            expect(result.current.inbox.id).toBe("a");
            expect(result.current.notice).toEqual({
                addresses: [inboxB.address],
                switched: false,
            });
        });

        it("says so when the server's list drops an expired inbox", async () => {
            storeSession();
            getSessionInboxes.mockResolvedValue([
                inboxA,
                { ...inboxB, expiresAt: inMinutes(-1) },
            ]);
            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.inboxes).toHaveLength(1));
            expect(result.current.notice).toEqual({
                addresses: [inboxB.address],
                switched: false,
            });
        });

        it("shows the purged state when the last inbox runs out", async () => {
            storeSession({
                inboxes: [{ ...inboxA, expiresAt: new Date(Date.now() + 150).toISOString() }],
            });
            const { result } = renderHook(() => useInbox());

            await waitFor(() => expect(result.current.status).toBe("expired"));
            expect(result.current.inbox).toBeNull();
        });

        describe("while an extend is on its way", () => {
            const runningOut = () => new Date(Date.now() + 150).toISOString();
            const pause = (ms) => act(() => new Promise((resolve) => setTimeout(resolve, ms)));

            it("keeps the inbox when its clock runs out, and adopts the new time", async () => {
                storeSession({ inboxes: [{ ...inboxA, expiresAt: runningOut() }] });
                const answer = deferred();
                extendInbox.mockReturnValue(answer.promise);
                const { result } = renderHook(() => useInbox());

                act(() => {
                    result.current.extend();
                });
                await pause(300);
                expect(result.current.status).toBe("active");
                expect(result.current.inbox.id).toBe("a");

                const later = inMinutes(5);
                await act(async () => {
                    answer.resolve({ expiresAt: later, extendCount: 1 });
                });
                await pause(50);

                expect(result.current.status).toBe("active");
                expect(result.current.inbox).toMatchObject({ id: "a", expiresAt: later });
            });

            it("lets the inbox go once a failed extend comes back", async () => {
                storeSession({ inboxes: [{ ...inboxA, expiresAt: runningOut() }, inboxB] });
                const answer = deferred();
                extendInbox.mockReturnValue(answer.promise);
                const { result } = renderHook(() => useInbox());

                act(() => {
                    result.current.extend();
                });
                await pause(300);
                expect(result.current.inbox.id).toBe("a");

                await act(async () => {
                    answer.reject(new Error("network down"));
                });

                await waitFor(() => expect(result.current.inbox.id).toBe("b"));
                expect(result.current.notice).toEqual({ addresses: [inboxA.address], switched: true });
            });
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
