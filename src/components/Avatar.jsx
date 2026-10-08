import { Blobatar } from "@blobatar/react";

// Blobatar draws the same face for the same name, so an address or sender
// looks like itself across rows, the rail and reloads. Decorative, so hidden
// from assistive technology.
//
// Static unless `animate` is passed: an animated blobatar is inline SVG running
// about eight endless CSS animations, so a list of them repaints every frame.
// Only the few that stand alone animate.
export default function Avatar({ seed, size = 42, animate, className = "" }) {
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
