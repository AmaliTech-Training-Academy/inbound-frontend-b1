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
    ApiError,
    createInbox,
    getInboxInfo,
    extendInbox,
    downloadAttachment,
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

        it("holds background traffic off after a 429, without blocking the next call", async () => {
            fetchMock.mockReturnValueOnce(tooMany()).mockReturnValueOnce(reply({ inboxes: [] }));

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({
                status: 429,
                message: "Too many requests from this IP, please try again later.",
            });
            expect(rateLimitedFor()).toBeGreaterThan(0);

            // A click still goes out: blocking it on a guess helps nobody.
            await expect(getSessionInboxes("tok")).resolves.toEqual([]);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });

        it("waits as long as the server says, when it says", async () => {
            fetchMock.mockReturnValueOnce(tooMany({ "RateLimit-Reset": "120" }));

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });

            expect(rateLimitedFor()).toBeGreaterThan(119_000);
            expect(rateLimitedFor()).toBeLessThanOrEqual(120_000);
        });

        it("guesses 30 seconds, then a minute, and never longer, when the server names no time", async () => {
            // The server's window is fixed: asking again does not extend it,
            // so a long guess would only keep the inbox waiting after it relents.
            vi.useFakeTimers({ toFake: ["Date"] });
            fetchMock.mockImplementation(() => tooMany());
            const waits = [];

            for (let i = 0; i < 4; i += 1) {
                await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });
                waits.push(rateLimitedFor());
            }

            expect(waits).toEqual([30_000, 60_000, 60_000, 60_000]);
        });

        it("ends the wait as soon as a request gets through", async () => {
            fetchMock.mockReturnValueOnce(tooMany()).mockReturnValueOnce(reply({ inboxes: [] }));

            await expect(getSessionInboxes("tok")).rejects.toMatchObject({ status: 429 });
            await getSessionInboxes("tok");

            expect(rateLimitedFor()).toBe(0);
        });
    });
    describe("downloadAttachment", () => {
        function fileReply(body, { status = 200, disposition, type = "image/png" } = {}) {
            const headers = { "Content-Type": type };
            if (disposition) headers["Content-Disposition"] = disposition;
            return Promise.resolve(new Response(body, { status, headers }));
        }

        it("asks the attachment endpoint with the session token as a bearer", async () => {
            fetchMock.mockReturnValue(fileReply("bytes"));

            await downloadAttachment("att-1", "sess_1", { fallbackName: "logo.png" });

            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe(`${API}/inbox/attachments/att-1`);
            expect(init.headers).toMatchObject({ Authorization: "Bearer sess_1" });
        });

        it("returns the bytes, not a parsed envelope", async () => {
            fetchMock.mockReturnValue(fileReply("the-bytes"));

            const { blob } = await downloadAttachment("att-1", "sess_1");

            expect(await blob.text()).toBe("the-bytes");
        });

        it("prefers the filename the server sends", async () => {
            fetchMock.mockReturnValue(
                fileReply("bytes", { disposition: 'attachment; filename="server-name.png"' }),
            );

            const { filename } = await downloadAttachment("att-1", "sess_1", {
                fallbackName: "local-name.png",
            });

            expect(filename).toBe("server-name.png");
        });

        it("reads the RFC 5987 encoded filename in preference to the plain one", async () => {
            fetchMock.mockReturnValue(
                fileReply("bytes", {
                    disposition: "attachment; filename=\"fallback.png\"; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf",
                }),
            );

            const { filename } = await downloadAttachment("att-1", "sess_1");

            expect(filename).toBe("résumé.pdf");
        });

        // The three forms Express 5's res.attachment() actually produces,
        // taken from content-disposition's own output rather than guessed:
        // bare for an ordinary name, quoted once there is a space or a quote
        // (inner quotes backslash-escaped), and both forms for non-ASCII.
        it.each([
            ["attachment; filename=logo_mark.png", "logo_mark.png"],
            ['attachment; filename="a b c.txt"', "a b c.txt"],
            ['attachment; filename="weird \\"quoted\\" name.txt"', 'weird "quoted" name.txt'],
        ])("reads the filename out of %s", async (disposition, expected) => {
            fetchMock.mockReturnValue(fileReply("bytes", { disposition }));

            const { filename } = await downloadAttachment("att-1", "sess_1");

            expect(filename).toBe(expected);
        });

        it("falls back to the name from the message when the server sends none", async () => {
            fetchMock.mockReturnValue(fileReply("bytes"));

            const { filename } = await downloadAttachment("att-1", "sess_1", {
                fallbackName: "local-name.png",
            });

            expect(filename).toBe("local-name.png");
        });

        it("raises the server's own message when the attachment is gone", async () => {
            fetchMock.mockReturnValue(
                Promise.resolve(
                    new Response(JSON.stringify({ success: false, message: "Attachment Not Found" }), {
                        status: 404,
                        headers: { "Content-Type": "application/json" },
                    }),
                ),
            );

            await expect(downloadAttachment("att-1", "sess_1")).rejects.toMatchObject({
                status: 404,
                message: "Attachment Not Found",
            });
        });

        it("still raises when the failure body is not json", async () => {
            fetchMock.mockReturnValue(fileReply("<html>502</html>", { status: 502, type: "text/html" }));

            await expect(downloadAttachment("att-1", "sess_1")).rejects.toMatchObject({ status: 502 });
        });
    });
    // isSessionDead decides whether one failed call ends the whole session.
    // Getting 404 wrong here throws a user out of a working inbox because one
    // attachment was missing, so the boundary is pinned rather than implied.
    describe("ApiError.isSessionDead", () => {
        it.each([
            [401, true],
            [403, true],
            [410, true],
            [404, false],
            [400, false],
            [429, false],
            [500, false],
        ])("status %i -> %s", (status, expected) => {
            expect(new ApiError(status, "x").isSessionDead).toBe(expected);
        });

        it("stays narrower than isDead, which counts a 404 as gone", () => {
            const missing = new ApiError(404, "Attachment not found");
            expect(missing.isDead).toBe(true);
            expect(missing.isSessionDead).toBe(false);
        });
    });
});
