// The design's heading reveal: every character rises into place, one after
// another. The design split the text with GSAP's SplitText; the heading is a
// fixed string at the top of the page, so splitting it here and staggering a
// CSS animation per character gives the same entrance with no animation
// library behind it.
//
// Words stay whole so a line can only break between them. The characters are
// hidden from assistive technology and the heading is labelled with the whole
// text instead, so it is read as a sentence rather than letter by letter.
export default function SplitText({
    text,
    tag: Tag = "p",
    className = "",
    // Milliseconds between one character and the next.
    delay = 50,
}) {
    const words = text.split(" ");
    let index = 0;

    return (
        <Tag aria-label={text} className={`inline-block ${className}`}>
            {words.map((word, w) => (
                <span key={w} aria-hidden="true">
                    <span className="inline-block whitespace-nowrap">
                        {Array.from(word).map((char) => {
                            const order = index++;
                            return (
                                <span
                                    key={order}
                                    className="inline-block animate-split-in will-change-transform motion-reduce:animate-none"
                                    style={{ animationDelay: `${order * delay}ms` }}>
                                    {char}
                                </span>
                            );
                        })}
                    </span>
                    {w < words.length - 1 && " "}
                </span>
            ))}
        </Tag>
    );
}
