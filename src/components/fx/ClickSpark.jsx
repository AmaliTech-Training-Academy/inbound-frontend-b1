import { useEffect, useRef } from "react";

// Every click throws a small ring of sparks from the pointer, drawn on one
// canvas over the whole app. Ported from the design's circleSpark.tsx, with two
// changes that keep it cheap:
//  - the frame loop only runs while sparks are alive (about 0.4s per click),
//    rather than redrawing an empty canvas sixty times a second;
//  - the canvas is pinned to the viewport, not stretched over the whole page,
//    so its size - and the area cleared each frame - is one screen, however
//    long the page is.

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

    // The canvas is the size of the viewport, following the window.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return undefined;

        let resizeTimeout;
        const resizeCanvas = () => {
            const { innerWidth: width, innerHeight: height } = window;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
        };
        resizeCanvas();

        const onResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(resizeCanvas, 100);
        };
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("resize", onResize);
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
        if (!canvasRef.current) return;
        // The canvas sits at the viewport's origin, so client coordinates are
        // canvas coordinates.
        const x = event.clientX;
        const y = event.clientY;
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
                className="pointer-events-none fixed inset-0 z-50 motion-reduce:hidden print:hidden"
            />
            {children}
        </div>
    );
}
