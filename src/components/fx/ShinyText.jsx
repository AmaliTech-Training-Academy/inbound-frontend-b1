// A band of light that sweeps across the text, as on the design's Generate
// button. The design drove it from framer-motion's frame loop; a background
// that slides under clipped text is the same picture in plain CSS, without
// pulling a motion library into the bundle for one effect.
export default function ShinyText({
    text,
    disabled = false,
    speed = 2,
    color = "#b5b5b5",
    shineColor = "#ffffff",
    spread = 120,
    className = "",
}) {
    return (
        <span
            className={`inline-block bg-clip-text text-transparent motion-reduce:animate-none ${
                disabled ? "" : "animate-shine"
            } ${className}`}
            style={{
                "--shine-duration": `${speed}s`,
                backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
                backgroundSize: "200% auto",
                backgroundPosition: "150% center",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
            }}>
            {text}
        </span>
    );
}
