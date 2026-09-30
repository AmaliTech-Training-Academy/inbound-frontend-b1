import { Blobatar } from "@blobatar/react";

// The design's blob avatars. Blobatar draws the same face for the same name,
// so an address or sender always looks like itself: across rows, across the
// rail and across reloads. Decorative - whatever it stands for is written next
// to it - so it stays hidden from assistive technology.
export default function Avatar({ seed, size = 42, animate = "hover", className = "" }) {
    return (
        <Blobatar
            name={seed || "inbound"}
            size={size}
            background="circle"
            animate={animate}
            className={`shrink-0 ${className}`}
        />
    );
}
