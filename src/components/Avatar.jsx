import { Blobatar } from "@blobatar/react";

// The design's blob avatars. Blobatar draws the same face for the same name,
// so an address or sender always looks like itself: across rows, across the
// rail and across reloads. Decorative - whatever it stands for is written next
// to it - so it stays hidden from assistive technology.
//
// Static unless asked. An animated blobatar is inline SVG running about eight
// endless CSS animations - even in "hover" mode, where they idle rather than
// stop - so a list of them kept the page busy every frame. A static one is a
// single <img>, and looks the same. The few that stand alone animate, all the
// time: the rail's handful (at most five) and the one in the empty reading
// pane.
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
