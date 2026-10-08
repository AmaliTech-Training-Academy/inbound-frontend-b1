import { Blobatar } from "@blobatar/react";
import { useTheme } from "../state/useTheme.js";

// Blobatar draws the same face for the same name, so an address or sender
// looks like itself across rows, the rail and reloads. Decorative, so hidden
// from assistive technology.
//
// The backdrop is a pale swatch the library draws for light surfaces, so in
// dark mode it reads as a white disc behind the face. Dropped rather than
// recoloured: transparent takes whatever is behind it, so the same avatar sits
// correctly on the page, on a card and in the rail without each being matched
// by hand.
//
// Static unless `animate` is passed: an animated blobatar is inline SVG running
// about eight endless CSS animations, so a list of them repaints every frame.
// Only the few that stand alone animate.
export default function Avatar({ seed, size = 42, animate, className = "" }) {
    const { isDark } = useTheme();
    return (
        <Blobatar
            name={seed || "inbound"}
            size={size}
            background={isDark ? false : "circle"}
            animate={animate}
            className={`shrink-0 ${className}`}
        />
    );
}
