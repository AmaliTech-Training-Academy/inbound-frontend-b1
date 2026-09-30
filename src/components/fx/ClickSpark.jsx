import { useEffect, useRef } from "react";

// Every click throws a small ring of sparks from the pointer, drawn on one
// canvas over the whole app. Ported from the design's circleSpark.tsx; the one
// change is that the frame loop only runs while sparks are alive, rather than
// redrawing an empty canvas sixty times a second for as long as the tab is open.

const EASINGS = {
    linear: (t) => t,
    "ease-in": (t) => t * t,
    "ease-in-out": (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    "ease-out": (t) => t * (2 - t),
};

export default function ClickSpark({
    sparkColor = "#fff",
    sparkSize = 10,
    sparkRadius = 15,
    sparkCount = 8,
    duration = 400,
    easing = "ease-out",
    extraScale = 1.0,
    children,
}) {
    const canvasRef = useRef(null);
    const sparksRef = useRef([]);
    const frameRef = useRef(0);
    const startRef = useRef(null);

    // Read by the frame loop, which is built once and outlives any render.
    const optionsRef = useRef(null);
    useEffect(() => {
        optionsRef.current = { sparkColor, sparkSize, sparkRadius, duration, easing, extraScale };
    });

    // The canvas tracks its parent's size. jsdom has no ResizeObserver, and a
    // browser without one still gets a canvas sized once.
    useEffect(() => {
        const canvas = canvasRef.current;
        const parent = canvas?.parentElement;
        if (!parent) return undefined;

        let resizeTimeout;
        const resizeCanvas = () => {
            const { width, height } = parent.getBoundingClientRect();
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
        };
        resizeCanvas();

        if (typeof ResizeObserver === "undefined") return undefined;
        const ro = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        });
        ro.observe(parent);
        return () => {
            ro.disconnect();
            clearTimeout(resizeTimeout);
        };
    }, []);

    useEffect(() => {
        const draw = (timestamp) => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!ctx) {
                frameRef.current = 0;
                return;
            }
            const { sparkColor, sparkSize, sparkRadius, duration, easing, extraScale } =
                optionsRef.current;
            const ease = EASINGS[easing] ?? EASINGS["ease-out"];

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            sparksRef.current = sparksRef.current.filter((spark) => {
                const elapsed = timestamp - spark.startTime;
                if (elapsed >= duration) return false;

                const eased = ease(elapsed / duration);
                const distance = eased * sparkRadius * extraScale;
                const lineLength = sparkSize * (1 - eased);
                const cos = Math.cos(spark.angle);
                const sin = Math.sin(spark.angle);

                ctx.strokeStyle = sparkColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(spark.x + distance * cos, spark.y + distance * sin);
                ctx.lineTo(
                    spark.x + (distance + lineLength) * cos,
                    spark.y + (distance + lineLength) * sin,
                );
                ctx.stroke();
                return true;
            });

            frameRef.current = sparksRef.current.length > 0 ? requestAnimationFrame(draw) : 0;
        };

        startRef.current = () => {
            if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
        };
        return () => {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = 0;
        };
    }, []);

    const handleClick = (event) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const now = performance.now();

        sparksRef.current.push(
            ...Array.from({ length: sparkCount }, (_, i) => ({
                x,
                y,
                angle: (2 * Math.PI * i) / sparkCount,
                startTime: now,
            })),
        );
        startRef.current?.();
    };

    return (
        <div className="relative min-h-screen w-full" onClick={handleClick}>
            <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-50 motion-reduce:hidden print:hidden"
            />
            {children}
        </div>
    );
}
