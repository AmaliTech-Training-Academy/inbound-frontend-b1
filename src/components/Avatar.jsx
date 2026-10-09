import { Blobatar } from "@blobatar/react";
import { useTheme } from "../hooks/useTheme.js";

// Blobatar draws the same face for the same name, so an address or sender
// looks like itself across rows, the rail and reloads. Decorative, so hidden
// from assistive technology.
//
// The backdrop is a pale swatch the library draws for light surfaces, so in
// dark mode it reads as a white disc behind the face. Dropped rather than
// recoloured: transparent takes whatever is behind it, so the same avatar sits
// correctly on the page, on a card and in the rail without each needing to be
// matched by hand.
//
// Static unless asked. An animated blobatar is inline SVG running about eight
// endless CSS animations - even in "hover" mode, where they idle rather than
// stop - so a list of them kept the page busy every frame. A static one is a
// single <img>, and looks the same. The few that stand alone animate, all the
// time: the rail's handful (at most five) and the one in the empty reading
// pane.
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
