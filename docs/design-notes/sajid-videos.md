# Design notes: Sajid's website and UI design videos

Source: the YouTube channel [@whosajid](https://www.youtube.com/@whosajid) (23 videos as of 2026-10-02).
These are notes in our own words, taken from each video's captions. They are not transcripts.
Each video has its rules, then where they could land in Inbound.

The first video (Premium Websites) is already applied on `feat/premium-design-exploration`.
The rest are a backlog to apply later.

## The videos

Listed in a sensible order to apply them: foundations first, polish last.

| # | Video | Length | Published | Topic | Status |
|---|---|---|---|---|---|
| 1 | [The Easy Way to Design Premium Websites](https://www.youtube.com/watch?v=DBJoepxxQdg) | 9 min | Sep 2026 | The six-step method | **Applied** (landing, How it works) |
| 2 | [The Easy Way to Pick UI Colors](https://www.youtube.com/watch?v=vvPklRN0Tco) | 10 min | ~2025 | Color tokens, light/dark | To apply |
| 3 | [The 80% of UI Design - Typography](https://www.youtube.com/watch?v=9-oefwZ6Z74) | 12 min | ~2025 | Type scale, hierarchy | To apply |
| 4 | [The Easy Way to Pick Perfect Spacing](https://www.youtube.com/watch?v=-O1ds-kPUZg) | 10 min | early 2026 | Spacing system | To apply |
| 5 | [The Easy Way to Fix Boring UIs](https://www.youtube.com/watch?v=wcZ6jSlZqDc) | 9 min | late 2025 | Depth: shades, shadows | To apply |
| 6 | [The Biggest Lie in UI Design](https://www.youtube.com/watch?v=OCgt_ESKHk4) | 9 min | Aug 2026 | "Less is more", context, states | To apply |
| 7 | [The Golden Rule of UI Design](https://www.youtube.com/watch?v=9zt__YPULm8) | 11 min | ~2025 | Don't make me think | To apply |
| 8 | [The Easy Way to Build Responsive Websites](https://www.youtube.com/watch?v=l04dDYW-QaI) | 18 min | ~2025 | Boxes, flex vs grid | To apply |
| 9 | [The Easy Way to Do Web Animations](https://www.youtube.com/watch?v=hZh-CiPt91w) | 21 min | early 2026 | Motion techniques | To apply |
| 10 | [The Easy Way to Design Top Tier Websites](https://www.youtube.com/watch?v=qyomWr_C_jA) | 12 min | ~2024 | Principles + creative process | To apply |
| 11 | [The Easiest Way to Build Websites](https://www.youtube.com/watch?v=OjEg0IBR_ak) | 11 min | ~2024 | Design first, hero anatomy | To apply |
| 12 | [Only Noobs Build Beautiful Websites](https://www.youtube.com/watch?v=NJGLR5gl6m4) | 18 min | ~2024 | Function over looks | To apply |
| 13 | [The Smart Way to Build Websites](https://www.youtube.com/watch?v=-uyI0TjhXdk) | 20 min | ~2025 | Design systems, components | To apply |
| 14 | [2 Ways of Building Websites](https://www.youtube.com/watch?v=Kkjpvfwhv-c) | 9 min | ~2024 | Marketing site vs web app | To apply |
| 15 | [23 Hacks about Building Websites](https://www.youtube.com/watch?v=AmY3db_Qs94) | 9 min | ~2024 | Native HTML/CSS tricks | To apply |
| 16 | [Design & CSS Tips](https://www.youtube.com/watch?v=xyA-1YBXNB4) | 6 min | ~2024 | CSS quick wins | To apply |

Not included, because they aren't about designing websites: *The Easy Way to Do Hard Things*,
*Original Ideas are Overrated* (borderline: it's about creativity, so it's worth a look if we want it),
*Vibe Coding is Getting Out of Hand*, *Don't ask AI to write your code*,
*So, you want to build apps & websites?*, *The Easy Way to Learn New Skills*,
*The Most Dramatic Coding Video*.

---

## 1. The Easy Way to Design Premium Websites (applied)

A page built only from defaults blends in and can't feel premium. Replace each default with a decision, in six steps:

1. **Type**: give each font a job. A display face with some character for headings, a readable body face, a mono for data.
2. **Layout**: move it off the centre line. Left-align on a real axis, which frees the right side of the hero.
3. **Color**: no background gradient wash. Use grays plus one accent (two at most), and spend the accent only where it earns its place.
4. **Content**: specific copy instead of generic SaaS lines. Real proof (real limits, real output) instead of fake logos and invented stats.
5. **Signature**: the hero's centrepiece demonstrates the product working, not an illustration of it.
6. **Craft**: carry the same care down the page. Tiles of different sizes, each showing something true. Motion that has a job.

**In Inbound (done):**
- Left-aligned hero.
- Haffer + JetBrains Mono, with mono for addresses, codes and limits.
- Glow removed; orange kept for the main action only.
- New headline and copy.
- Limits read from `config.js`.
- `CodeFinderDemo` runs the real extractor in the hero.
- How it works rebuilt as tiles of different sizes.

---

## 2. The Easy Way to Pick UI Colors

- A UI only needs three kinds of color:
  - neutrals (backgrounds, text, borders)
  - one brand/primary color (main actions, character)
  - semantic colors for states
- Think in **shades**, not colors. Use HSL or OKLCH, so a shade is a lightness step that reads clearly in code. Hex makes shades opaque.
- Neutral recipe (dark mode): background at lightness 0, surface at 5, raised at 10. Headings bright but not pure white; body text a step muted.
- Light mode: start from 100 − L, then fix by eye. The top-most (raised) layer should be the *lightest* in both modes.
- Name background tokens by meaning so they hold in both themes: `bg-dark` is always the darkest, `bg-light` always the lightest. Name text tokens by role.
- Four properties make surfaces come alive:
  - a visible-but-quiet **border**
  - a subtle **gradient** made from the background shades
  - a lighter top edge, the **highlight**
  - a **shadow**: a short dark one mixed with a long light one, using alpha
- In light mode, push the highlight to full white, let the border match the surface, and lean on the shadow.
- OKLCH keeps color in very dark and very light shades better than HSL. Tailwind v4 already uses it. For UI work, chroma rarely needs to go above ~0.15–0.2.
- Default theme in `:root`, the other behind `prefers-color-scheme` and/or a toggle.

**In Inbound:**
- Neutrals are ad-hoc Tailwind `slate-*` classes. Define role tokens in `@theme` (`src/index.css`): surface layers, text strong/muted, border, highlight, shadow.
- There is no dark mode yet (no `prefers-color-scheme` anywhere). These tokens are the prerequisite.
- Two colors are typed in as hex codes instead of using the color variables:
  - `ClickSpark` uses `#050040` (`src/App.jsx:57`), a different navy from `--color-ink` `#0b1c30`.
  - `BrandMark` hard-codes both of its fills (`src/components/BrandMark.jsx`).
- Hover states use `bg-brand/90` (an opacity change). A real darker shade of the accent reads better.

## 3. The 80% of UI Design - Typography

- Most UI is text and buttons, so type is the 20% of the work that gives 80% of the result.
- Group or separate with **size, weight, color and spacing**. A title must stand out *and* stand alone from the group under it.
- To emphasize something, de-emphasize its neighbours: lower the lightness of secondary text rather than shouting the primary.
- Type scale: pick a base (14 or 16px), set *everything* at that size, regular weight. Only step ±2px where it's truly needed. Most real UIs are nearly all one size; weight and color do the hierarchy.
- Use rem for sizes so users' font settings apply. Line-height (in em) doubles as the gap below text, so you rarely need extra margins.
- Tags carry document structure; styles carry visual hierarchy. An `h1` doesn't have to be the biggest text on screen.
- Zoom out to check. Big bold text can be harsh, so try a lighter weight. Design for changing values (numbers that grow).

**In Inbound:**
- Pick the base size and audit the inbox page. It mixes `text-[11px]`, `text-xs`, `text-sm` and `text-base` freely.
- Message rows: sender and subject strong, time and preview muted.

## 4. The Easy Way to Pick Perfect Spacing

- Use rem in steps of 0.25rem (4px). Most gaps end up at 1rem.
- Spacing's main job is **grouping and separating**:
  - closest related: below 1rem
  - padding and button groups: 1rem
  - separate sections: 1.5–2rem
- **Inner spacing ≤ outer spacing.** The gap between an icon and its label must be smaller than the button's horizontal padding. The exception is elements with different purposes (like/dislike), which can sit further apart.
- **Optical weight:** a button's vertical padding should be about ½–⅓ of its horizontal padding. Containers with stacked content need more even padding.
- Start generous (≈1.5rem) and reduce. Slightly too much space is better than too little.
- Consistency first: consistent-but-wrong spacing still looks okay; random spacing never does.
- Process:
  1. Split the UI into groups.
  2. Space within each group, then between groups.
  3. Make row heights equal.
  4. Use `space-between` for label/control rows.
  5. Put the main action on the right.
  6. Lay cards on a grid so their widths are equal.
  7. Match the gap to the padding.
- A minimal set (0.5 / 1 / 2rem) covers most gaps and padding, and pairs well with border radii.

**In Inbound:**
- Audit the pills: does the address pill's padding exceed the gaps between its children?
- Check the dialog forms (`NewInboxDialog`) for equal row heights and the primary action on the right.

## 5. The Easy Way to Fix Boring UIs (depth)

- Two steps:
  1. Make 3–4 shades of one color (about +10% lightness each). Lighter layers sit on top and feel closer, so give them to important and interactive elements.
  2. Add shadows. The small shadow is a light inset highlight on top plus a short dark shadow below; scale both up for bigger elevations. Use a bigger shadow on hover.
- A darker page background makes the key surfaces pop. Then push less important surfaces back down with darker shades.
- When shades already separate the layers, drop the borders.
- **Inset shadows** (dark on top, light on the bottom) sink an element: tables, progress tracks. A progress fill inside a sunken track looks raised.
- A gradient plus a light inner top edge reads as a surface lit from above.
- Don't ignore light mode; it's most people's default. Use color and shadow variables so both themes work.
- Going from average to good is cheap; going from good to S-tier is expensive. Depth is the cheap win.

**In Inbound:**
- On the inbox page, layer the rail, the message list and the reader as three surface shades.
- Give the selected message row and the code card the small shadow.
- Make the expiry-timer track an inset with a raised fill.

## 6. The Biggest Lie in UI Design

- "Less is more" is training wheels. Removing things forces the right question (does this add value?), but it became a style: empty, borderless, colorless and soulless.
- Don't think less versus more. Simple ≠ few elements, and busy ≠ confusing. Some moments call for rich and expressive, others for deliberately plain.
- A design that is "more" but has clear hierarchy feels *simpler*: one bold thing, one colored thing, the rest muted, so the eye has a place to land.
- **Context beats minimalism:**
  - charts need axes and tooltips
  - search results need snippets and breadcrumbs
  - zero results should suggest something
- **States:**
  - Empty states must point the way forward.
  - Loading states should name the step and show real progress, not a bare spinner.
- Walls of text:
  1. Make everything one quiet style.
  2. Decide what the user needs first and lift it.
  3. Drop redundant labels.
  4. Group into "pockets".
  5. Color-code statuses using familiar conventions.
  6. Then add depth.

**In Inbound:**
- The empty inbox (`InboxPage.jsx`, `EmptyInbox`) already shows the address and "Waiting for incoming mail…". Add a copy button, since copying is the next step.
- "No messages match …" (`InboxPage.jsx:229`) should offer to clear the search.
- Creating an inbox could name its steps (creating → connecting → catching up) instead of a generic "Generating".
- The message reader is a candidate for the wall-of-text pass: code first, then sender and subject, then everything else.

## 7. The Golden Rule of UI Design (don't make me think)

- Users scan and click the first reasonable option. Make the right option the most obvious one.
- Keep conventions:
  - navigation where people expect it
  - buttons that look like buttons
  - standard icons
  - primary actions in the same place on every screen
- Simple doesn't mean useless-minimal. Show everything needed to decide; cut whatever doesn't help (a third button, a gratuitous animation).
- Make text scannable: headings, bullets, clear hierarchy.
- Map the user flow for a persona and cut clicks and layers. Offer a search shortcut.
- Underline clickable text. Group things that belong together. When two buttons compete, use color to rank them.
- Settle design arguments with a usability test against a competitor.

**In Inbound:**
- Underline inline links.
- Check the three dialogs (`NewInboxDialog`, `ConfirmDestroyDialog`, the full-screen reader) put the primary action consistently on the right.

## 8. The Easy Way to Build Responsive Websites

- Think in boxes: a parent/child tree. Sketch it, and how it changes at each breakpoint, before writing markup. A rough sketch prevents settling for a "good enough" layout.
- Every design is rows and columns. Responsive layout is mostly boxes moving between them.
- Use flexbox by default, and grid when you want strict, equal structure.
- `flex: 1 1 auto` is the workhorse. `flex-grow` is proportional. With `flex-basis: auto`, spare space goes to the bigger item; set a basis to make items grow equally.
- Equal cards that wrap without overflowing: `repeat(auto-fit, minmax(min(…, 100%), 1fr))`.
- Use descriptive, unique class names, and put media queries last.
- A sticky item inside a flex parent needs `align-self: flex-start`.
- On small screens, overlay the sidebar instead of squeezing the layout.
- Offer a theme toggle, or at least follow the system theme.

**In Inbound:**
- Sketch the inbox page's rail / list / reader tree at each breakpoint before restyling it.

## 9. The Easy Way to Do Web Animations

- Toolbox:
  - `animation` with `@keyframes` (percent stops or from/to)
  - `transition` for state changes; define one transition variable and reuse it
  - easing: `ease-in` (pulling away), `ease-out` (stopping), or a custom `cubic-bezier`; a slight overshoot gives weight
- Patterns:
  - **Sliding highlight:** a ghost element measured with JS (`offsetLeft`/`offsetWidth`) that CSS then glides to the hovered or active item.
  - Underline grow from a pseudo-element.
  - Fan-out buttons.
  - Click pop with a glow.
  - **Shine sweep:** a skewed gradient pseudo-element moving from −100% to 100%.
  - 3D flip: `perspective: ~800px`, `preserve-3d`, `backface-visibility: hidden`.
  - Scroll-driven reveals.
  - **Fly-to-target:** clone the element with `position: fixed`, measure with `getBoundingClientRect`, run `element.animate`, and update the counter only when it lands.
  - `offset-path` motion.
  - SVG line drawing (`pathLength=1` plus `stroke-dashoffset`).
  - Input shake on error.
  - SVG morphing; paths need equal point counts (shapeshifter.design).
- Animation is about timing: chain delays so feedback lands when the action completes.
- Trigger animations from real buttons for accessibility.

**In Inbound:**
- A sliding active indicator in the inbox rail.
- A new message dropping into the list (the How it works tile already does this).
- The copy button morphing into a check.
- A shake on a failed action.
- Keep all of it behind `prefers-reduced-motion`. Keep the existing rule: no loops that repaint large areas.

## 10. The Easy Way to Design Top Tier Websites

- Design as little as possible. Start from the key function (often a heading, an input and a button), not from the header.
- Group with similarity and proximity. The page must make sense as a whole within seconds.
- Elements need more space than you think: start big, then reduce.
- Run a small design system:
  - 4-based spacing in rem, kept as variables
  - one font and a type scale
  - text and background colors plus 1–2 accent colors
  - a primary and a secondary style for buttons and links
- Don't center paragraphs or small text. Smaller text needs more line-height.
- Hierarchy is everything: size, weight and color, applied lightly. De-emphasize competitors, then zoom out to check.
- Exceptions to "less": depth through shadows and color, a subtle gradient instead of flat, cards for bland content.
- Creative process:
  1. Learn the basics (books: *Refactoring UI*, *Atomic Design*).
  2. Gather real references.
  3. Study them as a user.
  4. Step away.
  5. Test with people, and don't fall in love with v1.

## 11. The Easiest Way to Build Websites

- Design first (audience, problem, real content), then build. The content decides the structure, such as whether to use cards and how many.
- Hero anatomy:
  - a heading that answers "what problem do you solve for me"
  - 2–3 sentences
  - an image, video or **product demo**
  - the CTA right there
- Two-column heroes adapt to small screens more easily.
- Every later section has one purpose. Write headings that answer users' real questions or state what competitors don't offer.
- Colors: black, white, plus accents for buttons, borders and gradients. Fonts: one, or 2–3 at most. Keep both as variables (this also makes dark mode cheap).
- Closing tips: fluid heading sizes (`clamp`), flexible cards, SVG icons, scroll snapping, gentle hover scale.

**In Inbound:**
- A short questions section on How it works could answer the real ones using `<details>`:
  - Is it private?
  - How long does it last?
  - Can I get more time?
  - Can I have several?

## 12. Only Noobs Build Beautiful Websites

- Design solves a problem; it isn't art. Top sites prioritize speed, responsiveness and ease of use over Dribbble beauty.
- Five pillars:
  1. **Layout**: rows and columns, reflowing per device; 4-divisible sizes; consistent gaps; repeated patterns.
  2. **Typography**: one clean font; everything at body size first, then scale the important parts up and the least relevant down.
  3. **Color**: mostly black and white, plus an accent used about 5–10% of the time, with a darker shade for hover.
  4. **Images**: few, optimized, meaningful.
  5. **Content**: the most important pillar.
- Ship a good-enough v1, then iterate on feedback and data.

## 13. The Smart Way to Build Websites

- Real sites are a handful of reusable components with props: a feature (icon, heading, details), a two-column media/text block with a reversible direction, a CTA, header and footer.
- Setup:
  - a reset
  - global variables for colors, fonts and spacing
  - styles for headings, links and buttons that use those variables only, never raw values
  - a few utility classes
- Edit components in one place (web components, Svelte or Astro, or Tailwind). Clients judge the result, not the method.

**In Inbound:** already component-based (React + Tailwind). The gap is the raw values noted under video 2.

## 14. 2 Ways of Building Websites

- A **marketing site** is about content and design, and has room for expression.
- A **web app** is about function: simple, fast, mobile-friendly, and consistent components that hold dynamic data.
- Either way, a design system is just the list of repeating elements: colors, fonts, button types (filled and outline), sections.

**In Inbound:**
- The landing and How it works pages are the marketing site, so they get the expressive treatment.
- The inbox is the web app: function first, consistent components, speed.

## 15. 23 Hacks about Building Websites (the relevant ones)

- HSL/OKLCH: make hover shades by changing lightness. Palette trick: tertiary and accent colors at ±60° hue from the primary.
- `color-scheme` / `prefers-color-scheme` for a free dark mode. Raise the accent's lightness on dark backgrounds.
- WebP images, and `<picture>` with a smaller source for mobile. SVG for icons.
- Native elements:
  - `<dialog>` with `showModal()`
  - `inert`
  - `<details>` / `<summary>`
  - `<datalist>`
  - `<progress>` / `<meter>`
  - `title` tooltips
- `aspect-ratio`; `inputmode` (the right mobile keyboard); `text-underline-offset`.
- Put hover effects inside `@media (hover: hover)` so they don't stick on touch screens.

**In Inbound:**
- The dialogs are hand-built `role="dialog"` divs with their own Escape and focus handling. Native `<dialog>` and `inert` are an option, but low priority because the current ones work and are tested.
- Wrap hover-only effects in `@media (hover: hover)`.

## 16. Design & CSS Tips

- Subtle linear gradients on buttons and borders.
- Cards to group related content (padding, rounded corners).
- Hover effects.
- `clamp()`, viewport units and flex ratios for fluid sizing.
- `scroll-snap`.
- Styled list markers.
- Buttons with character (background, border, padding, a shadow, a little motion).
- SVG float, fill and reveal animations.

---

## Where the videos pull against each other

Decide these once, before applying the backlog:

- **How many accents?** Premium Websites says one (two at most). Top Tier and Easiest Way allow two accents. Only Noobs says one, used 5–10% of the time. *Current choice: one (the brand orange), plus semantic colors for states.*
- **Gradients?** Premium Websites removes decorative background washes. Colors, Depth and Tips use *subtle surface* gradients lit from above. *These don't conflict: no page-wide washes, subtle gradients on raised surfaces are fine.*
- **One font or a font per job?** Only Noobs and Easiest Way say one font. Premium Websites gives each font a job. *Current: Haffer for everything readable, JetBrains Mono for data. That's two, each with a job.*
- **Less or more?** Biggest Lie: neither; it depends on the moment. The inbox (a tool) leans plain; the landing page (marketing) can be expressive.
- **Dark mode.** Several videos push a theme toggle or following the system theme. Inbound is light-only today, and adding dark mode needs the color tokens from video 2 first.
- **Figma.** The team's source of truth is the Figma file. Anything adopted here should go back into Figma or be agreed with the team before it reaches `dev`.
