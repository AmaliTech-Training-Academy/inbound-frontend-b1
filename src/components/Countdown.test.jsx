import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import Countdown from "./Countdown.jsx";

const NOW = new Date("2026-09-16T10:00:00.000Z").getTime();

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
});

afterEach(() => {
    vi.useRealTimers();
});

const inSeconds = (s) => new Date(NOW + s * 1000).toISOString();

describe("Countdown", () => {
    it("formats the remaining time as mm:ss", () => {
        render(<Countdown expiresAt={inSeconds(9 * 60 + 5)} />);
        expect(screen.getByText("09:05")).toBeInTheDocument();
    });

    it("zero-pads both parts", () => {
        render(<Countdown expiresAt={inSeconds(65)} />);
        expect(screen.getByText("01:05")).toBeInTheDocument();
    });

    it("counts down as time passes", () => {
        render(<Countdown expiresAt={inSeconds(30)} />);
        expect(screen.getByText("00:30")).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.getByText("00:25")).toBeInTheDocument();
    });

    it("stops at 00:00 instead of going negative", () => {
        render(<Countdown expiresAt={inSeconds(2)} />);

        act(() => {
            vi.advanceTimersByTime(10_000);
        });

        expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("shows 00:00 when expiresAt is missing", () => {
        render(<Countdown expiresAt={undefined} />);
        expect(screen.getByText("00:00")).toBeInTheDocument();
    });

    it("renders minutes above 59 without wrapping to hours", () => {
        // The inbox never lives this long today, but the component should not
        // silently misreport if a longer TTL is ever configured.
        render(<Countdown expiresAt={inSeconds(75 * 60)} />);
        expect(screen.getByText("75:00")).toBeInTheDocument();
    });
});
