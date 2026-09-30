import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The rest of the suite runs the in-browser mock. These specs exercise the
// real HTTP client against the session-token contract, with fetch stubbed.
vi.mock("../config.js", async () => {
    const actual = await vi.importActual("../config.js");
    return {
        ...actual,
        USE_MOCK: false,
        API_BASE: "https://api.test/server/api/v1",
    };
});

import {
    createInbox,
    getInboxInfo,
    extendInbox,
    fetchUnreadMessages,
    getSessionInboxes,
    rateLimitedFor,
    resetRateLimit,
} from "./inboxApi.js";

const API = "https://api.test/server/api/v1";

function reply(data, status = 200) {
    return Promise.resolve(
        new Response(JSON.stringify({ success: status < 400, data }), {
            status,
            headers: { "Content-Type": "application/json" },
        }),
    );
}

describe("inboxApi (session-token contract)", () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
        resetRateLimit();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("createInbox", () => {
        it("takes the token from the session, the only token issued", async () => {
            fetchMock.mockReturnValue(
                reply(
                    {
                        session: { token: "sess_1", expiresAt: "2026-09-29T10:00:00Z" },
                        id: "inbox-1",
                        address: "a@inbound.test",
                        expiresAt: "2026-09-29T10:00:00Z",
                    },
                    201,
                ),
            );

            const inbox = await createInbox();

            expect(inbox).toMatchObject({
                id: "inbox-1",
                address: "a@inbound.test",
                token: "sess_1",
                expiresAt: "2026-09-29T10:00:00Z",
            });
            expect(inbox).not.toHaveProperty("session");
        });

        it("rejects a response with no session token", async () => {
            fetchMock.mockReturnValue(
                reply(
                    {
                        id: "inbox-1",
                        address: "a@inbound.test",
                        expiresAt: "2026-09-29T10:00:00Z",
                    },
                    201,
                ),
            );

            await expect(createInbox()).rejects.toThrow(/missing required fields/);
        });
    });

    it("reads inbox info by id, since one session can own several inboxes", async () => {
        fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:00:00Z" }));

        await getInboxInfo("inbox-1", "sess_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/inbox-1`);
        expect(init.headers.Authorization).toBe("Bearer sess_1");
    });

    it("extends an inbox by id", async () => {
        fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:05:00Z" }));

        await extendInbox("inbox-1", "sess_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/extend/inbox-1`);
        expect(init.method).toBe("PATCH");
    });

    it("adds an inbox to an existing session by sending its token", async () => {
        fetchMock.mockReturnValue(
            reply(
                {
                    session: { token: "sess_1", expiresAt: "2026-09-29T10:10:00Z" },
                    id: "inbox-2",
                    address: "b@inbound.test",
                    expiresAt: "2026-09-29T10:10:00Z",
                },
                201,
            ),
        );

        const inbox = await createInbox({ sessionToken: "sess_1" });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox`);
        expect(init.headers.Authorization).toBe("Bearer sess_1");
        expect(inbox).toMatchObject({
            id: "inbox-2",
            token: "sess_1",
            sessionExpiresAt: "2026-09-29T10:10:00Z",
        });
    });

    it("starts a new session when no token is given", async () => {
        fetchMock.mockReturnValue(
            reply(
                {
                    session: { token: "sess_new", expiresAt: "2026-09-29T10:00:00Z" },
                    id: "inbox-1",
                    address: "a@inbound.test",
                    expiresAt: "2026-09-29T10:00:00Z",
                },
                201,
            ),
        );

        await createInbox();

        expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
    });

    it("lists a session's inboxes", async () => {
        const inboxes = [
            { id: "inbox-1", address: "a@inbound.test", expiresAt: "2026-09-29T10:00:00Z", messageCount: 2 },
        ];
        fetchMock.mockReturnValue(reply({ inboxes }));

        const listed = await getSessionInboxes("sess_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/session/inboxes`);
        expect(init.headers.Authorization).toBe("Bearer sess_1");
        expect(listed).toEqual(inboxes);
    });

    it("scopes unread recovery to one inbox and unwraps the list", async () => {
        const rows = [{ id: "m1", subject: "Code" }];
        fetchMock.mockReturnValue(reply({ session: {}, messages: rows }));

        const unread = await fetchUnreadMessages("sess_1", { inboxId: "inbox-1" });

        expect(fetchMock.mock.calls[0][0]).toBe(
            `${API}/inbox/messages/unread/all?inboxId=inbox-1`,
        );
        expect(unread).toEqual(rows);
    });

    describe("rate limiting", () => {
        // What express-rate-limit sends past 100 requests in 15 minutes.
        function tooMany(headers = {}) {
            return Promise.resolve(
                new Response(
                    JSON.stringify({ status: 429, message: "Too many requests from this IP, please try again later." }),
                    { status: 429, headers: { "Content-Type": "application/json", ...headers } },
                ),
            );
        }

        it("stops asking once the server says slow down", async () => {
            fetchMock.mockReturnValueOnce(tooMany());

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({
                status: 429,
                message: "Too many requests from this IP, please try again later.",
            });
            expect(rateLimitedFor()).toBeGreaterThan(0);

            // The next call is refused here, without spending another request.
            await expect(getInboxInfo("inbox-1", "tok")).rejects.toMatchObject({
                status: 429,
                message: expect.stringMatching(/^The server asked us to slow down\. Try again in /),
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it("waits as long as the server says, when it says", async () => {
            fetchMock.mockReturnValueOnce(tooMany({ "RateLimit-Reset": "120" }));

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });

            expect(rateLimitedFor()).toBeGreaterThan(119_000);
            expect(rateLimitedFor()).toBeLessThanOrEqual(120_000);
        });

        it("waits longer after each refusal when the server names no time", async () => {
            vi.useFakeTimers();
            fetchMock.mockImplementation(() => tooMany());

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });
            const first = rateLimitedFor();
            vi.advanceTimersByTime(first);

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });
            expect(rateLimitedFor()).toBe(first * 2);
        });

        it("asks again once the wait is over", async () => {
            vi.useFakeTimers();
            fetchMock.mockReturnValueOnce(tooMany()).mockReturnValueOnce(reply({ inboxes: [] }));

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });
            vi.advanceTimersByTime(rateLimitedFor());

            await expect(getSessionInboxes("tok")).resolves.toEqual([]);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });
});
