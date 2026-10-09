import { describe, it, expect, vi, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNotifications } from "./useNotifications.js";

const note = (key, text = key) => ({ key, kind: "message", text });

function setup(options) {
    return renderHook(() => useNotifications(options));
}

describe("useNotifications", () => {
    afterEach(() => vi.useRealTimers());

    it("starts empty", () => {
        const { result } = setup();

        expect(result.current.notifications).toEqual([]);
    });

    it("shows what it is given, oldest first", () => {
        const { result } = setup();

        act(() => {
            result.current.notify(note("a"));
            result.current.notify(note("b"));
        });

        expect(result.current.notifications.map((n) => n.key)).toEqual(["a", "b"]);
    });

    // The point of keying: a caller may re-announce the same occurrence on
    // every render without having to remember whether it already did.
    it("ignores a key that is already showing", () => {
        const { result } = setup();

        act(() => {
            result.current.notify(note("a", "first"));
            result.current.notify(note("a", "second"));
        });

        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].text).toBe("first");
    });

    // Two in the same tick both pass the "is it showing" check unless the
    // record is written before the state update rather than after it.
    it("keeps both when two arrive in one tick", () => {
        const { result } = setup();

        act(() => {
            result.current.notify(note("a"));
            result.current.notify(note("b"));
        });

        expect(result.current.notifications).toHaveLength(2);
    });

    it("dismisses by hand", () => {
        const { result } = setup();

        act(() => {
            result.current.notify(note("a"));
            result.current.notify(note("b"));
        });
        act(() => result.current.dismiss("a"));

        expect(result.current.notifications.map((n) => n.key)).toEqual(["b"]);
    });

    it("dismisses itself after a readable interval", () => {
        vi.useFakeTimers();
        const { result } = setup({ dismissAfterMs: 1000 });

        act(() => result.current.notify(note("a")));
        expect(result.current.notifications).toHaveLength(1);

        act(() => vi.advanceTimersByTime(1000));
        expect(result.current.notifications).toEqual([]);
    });

    // Dismissed by hand, then its timer fires: nothing should come back, and
    // nothing should be dismissed twice.
    it("forgets the timer of one dismissed by hand", () => {
        vi.useFakeTimers();
        const { result } = setup({ dismissAfterMs: 1000 });

        act(() => result.current.notify(note("a")));
        act(() => result.current.dismiss("a"));
        act(() => vi.advanceTimersByTime(2000));

        expect(result.current.notifications).toEqual([]);
        // The key is free again once it has gone.
        act(() => result.current.notify(note("a")));
        expect(result.current.notifications).toHaveLength(1);
    });

    // Five inboxes can deliver at once; a stack taller than the screen is
    // worse than no stack.
    it("keeps the newest few and drops what overflows", () => {
        const { result } = setup();

        act(() => {
            ["a", "b", "c", "d", "e", "f"].forEach((key) => result.current.notify(note(key)));
        });

        expect(result.current.notifications.map((n) => n.key)).toEqual(["c", "d", "e", "f"]);
    });

    it("does not fire a timer into a component that has gone", () => {
        vi.useFakeTimers();
        const { result, unmount } = setup({ dismissAfterMs: 1000 });

        act(() => result.current.notify(note("a")));
        unmount();

        expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
    });
});
