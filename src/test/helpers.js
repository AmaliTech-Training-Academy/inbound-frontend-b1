// Shared helpers for the tests. Test-only, so they stay out of src/utils and
// out of the app bundle.

import { prepareEmail } from "../utils/emailHtml.js";

/** The cleaned email as a document, to query like the reader would see it. */
export function cleaned(html) {
    // In this document rather than a separate one, so jest-dom's matchers
    // accept the elements.
    const root = document.createElement("div");
    root.innerHTML = prepareEmail(html);
    return { body: root, querySelector: (s) => root.querySelector(s), querySelectorAll: (s) => root.querySelectorAll(s) };
}
