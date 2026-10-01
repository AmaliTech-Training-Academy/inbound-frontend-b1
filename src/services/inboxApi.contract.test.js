import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The rest of the suite runs the in-browser mock. These specs exercise the
// real HTTP client against the published inbox-token contract, with fetch
// stubbed.
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
    fetchInboxMessages,
    fetchUnreadMessages,
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

describe("inboxApi (inbox-token contract)", () => {
    let fetchMock;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("createInbox", () => {
        it("takes the session token, the only one the deployed server issues", async () => {
            // The docs describe a per-inbox token beside the session one; the
            // deployed server sends only the session token and authenticates
            // every call with it (checked 2026-09-30).
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

        it("rejects a response carrying no token at all", async () => {
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

        it("posts to /inbox with no body and no credentials", async () => {
            fetchMock.mockReturnValue(
                reply(
                    {
                        id: "inbox-1",
                        address: "a@inbound.test",
                        token: "inbox_tok_1",
                        expiresAt: "2026-09-29T10:00:00Z",
                    },
                    201,
                ),
            );

            await createInbox();

            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe(`${API}/inbox`);
            expect(init.method).toBe("POST");
            expect(init.headers?.Authorization).toBeUndefined();
        });
    });

    it("reads the inbox its token belongs to, which takes no id", async () => {
        fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:00:00Z" }));

        await getInboxInfo("inbox_tok_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/info`);
        expect(init.headers.Authorization).toBe("Bearer inbox_tok_1");
    });

    it("extends the inbox its token belongs to", async () => {
        fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:05:00Z" }));

        await extendInbox("inbox_tok_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/extend`);
        expect(init.method).toBe("PATCH");
        expect(init.headers.Authorization).toBe("Bearer inbox_tok_1");
    });

    it("rejects an extend response with no expiresAt", async () => {
        fetchMock.mockReturnValue(reply({ extendCount: 2 }));

        await expect(extendInbox("inbox_tok_1")).rejects.toThrow(/expiresAt/);
    });

    it("sweeps the inbox's whole list, which the token already scopes", async () => {
        const rows = [{ id: "m1", subject: "Code" }];
        fetchMock.mockReturnValue(reply({ messages: rows }));

        const messages = await fetchInboxMessages("inbox_tok_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/messages`);
        expect(init.headers.Authorization).toBe("Bearer inbox_tok_1");
        expect(messages).toEqual(rows);
    });

    it("accepts a bare list as well as an enveloped one", async () => {
        const rows = [{ id: "m1", subject: "Code" }];
        fetchMock.mockReturnValue(reply(rows));

        await expect(fetchInboxMessages("inbox_tok_1")).resolves.toEqual(rows);
    });

    it("rejects a sweep response whose messages are not a list", async () => {
        fetchMock.mockReturnValue(reply({ messages: null }));

        await expect(fetchInboxMessages("inbox_tok_1")).rejects.toThrow(
            /not a list/,
        );
    });

    it("reads the unread view of the same list, taking no inboxId", async () => {
        const rows = [{ id: "m1", subject: "Code" }];
        fetchMock.mockReturnValue(reply({ messages: rows }));

        const unread = await fetchUnreadMessages("inbox_tok_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(`${API}/inbox/messages/unread/all`);
        expect(init.headers.Authorization).toBe("Bearer inbox_tok_1");
        expect(unread).toEqual(rows);
    });

    it("rejects an unread response whose messages are not a list", async () => {
        fetchMock.mockReturnValue(reply({ messages: null }));

        await expect(fetchUnreadMessages("inbox_tok_1")).rejects.toThrow(
            /not a list/,
        );
    });

    describe("addressing one inbox of a session", () => {
        it("reads inbox info by id", async () => {
            fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:00:00Z" }));

            await getInboxInfo("sess_1", { inboxId: "inbox-1" });

            expect(fetchMock.mock.calls[0][0]).toBe(`${API}/inbox/inbox-1`);
        });

        it("extends an inbox by id", async () => {
            fetchMock.mockReturnValue(reply({ expiresAt: "2026-09-29T10:05:00Z" }));

            await extendInbox("sess_1", { inboxId: "inbox-1" });

            expect(fetchMock.mock.calls[0][0]).toBe(`${API}/inbox/extend/inbox-1`);
        });

        it("scopes the message list to the inbox", async () => {
            fetchMock.mockReturnValue(reply({ messages: [] }));

            await fetchInboxMessages("sess_1", { inboxId: "inbox-1" });

            expect(fetchMock.mock.calls[0][0]).toBe(`${API}/inbox/messages?inboxId=inbox-1`);
        });

        it("falls back to the unread list while the full list route answers 404", async () => {
            // The deployed server's /inbox/:id route catches /inbox/messages.
            const rows = [{ id: "m1", subject: "Code" }];
            fetchMock
                .mockReturnValueOnce(reply(null, 404))
                .mockReturnValueOnce(reply({ messages: rows }));

            const messages = await fetchInboxMessages("sess_1", { inboxId: "inbox-1" });

            expect(fetchMock.mock.calls[1][0]).toBe(
                `${API}/inbox/messages/unread/all?inboxId=inbox-1`,
            );
            expect(messages).toEqual(rows);
        });
    });
});
