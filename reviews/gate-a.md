# Gate A: design lead review of the R1a foundations

Scope: foundations only (tokens, base.css, ui.module.css, ThemeToggle, new components). /predict copy and layout are the old ones and are not judged.
Evidence: reviews/shots/gateA/predict-{375,1280,1440}-{light,dark}-{fold,full}.png, design/tokens.json, web/src/styles/base.css, web/src/components/ui.module.css, ThemeToggle.tsx, design/palette-validation.md, curl of /predict.

## What works (keep)
- Type scale: body 18 / h2 28 / h1 44 gives h1:body 2.4, h2:body 1.56, caption (16) : body 0.89. Hierarchy reads in one glance at 1280 and 1440. Line heights 1.6 body, 1.15 h1, 1.3 h2 are right. The 22 px muted dek sits well between h1 and body.
- One container: header, nav, H1, tabs, legend, figure title and the Data button share the same left and right edges at 1280 (32 px gutter) and 1440 (content centred, 112 px left edge, nav aligned with it). No stray left offsets. The H1 now fills the header (2 lines at 1280/1440) and the early-break problem is gone.
- Contrast: text 17.8:1 light; text-muted 7.8:1 light and about 8:1 dark (#A3ABB6 on #0F1216). Accent 7.2:1. Dark mode is consistent, with no pure-black or pure-white glare.
- Chart text: live chart ticks and legends render at 14 to 15 px, the same size as the scale, and are legible in both themes.
- Touch targets: tabs, segmented control, Data button, theme button (44 x 44) and Menu button are all at least 44 px high. The base.css `:where(...)` rule makes this the default.
- Theme switch: a single 44 px bordered icon button on the right of the header; sun in light, moon in dark; `aria-pressed`, `aria-label` and `title` set; visible focus ring. Clear and unobtrusive.
- Magnitude ramp: viridis warnings are documented honestly (low end 1.26:1 in light, 1.23:1 in dark) with the border, value-label and data-table rule.

## Findings

### Blockers
None.

### Should-fix (do before or during R2, cheap)
1. **h2 does not shrink on mobile** (base.css `h2`, tokens `xl` 28 only). R2 makes every h2 a full-sentence takeaway (up to about 90 characters). At 375 with 17 px body that is 5 to 6 lines of 28 px type, as the old long h2 already shows in the full-page shot. Add a mobile step (about 22 to 24 px, i.e. `lg` or a new `scale_mobile.xl`) in tokens.json and gen_tokens.py. Also check that the h1 at 34 px stays at or under 4 lines for 75-character headings (the current 5 to 6 lines come from the long old H1).
2. **`.statGrid` is 2 columns from 768 px regardless of its container** (ui.module.css:74). Inside the 4-column ResultSection aside (about 300 px at 1024, about 400 px at 1280) that gives two cards about 120 to 190 px wide with a 44 px number and 20 px padding, which is cramped or wrapped. Use `repeat(auto-fit, minmax(14rem, 1fr))` or a single column inside the aside. Tell R2: stack StatCards in the aside, use StatGrid only full-width.
3. **Prerendered SVG widths do not match the new figure slots.** The static chart SVGs are 793 px (8-column slot at 1280) or 976 px (full width) with `max-width:100%` only, so they never grow. A full-width figure (1216 px) shows a 976 px static chart then jumps when the live chart mounts (layout shift, and the print and no-JS view). In the 8-column slot at 1024 to 1279 the 793 px SVG scales to about 78 percent, so the 14 px text drops to about 11 px in the static view. Files: lib/vegaServer.ts, chart.module.css. Prerender at the slot width (about 800 for 8 columns, about 1216 for full width) and keep the 360 px variant for under 600 px. Narrow variants only exist below 600 px; 600 to 790 px scales down similarly.
4. **Callouts and prose leave an empty right side on single-column blocks** (`.callout` max-width 52rem, `.prose` 68ch). This is correct once they sit in an aside or 8-column slot, but any full-width block outside ResultSection (tables, callouts) still ends at about 830 px at 1440 beside a 1216 px table. R2 should never place a callout or text block as a bare child of main; put it in the aside or in `ResultSection` children.

### Nits
5. Theme icon shows the current state (sun in light), a common but ambiguous convention; the label "Dark theme" with `aria-pressed` is correct for a toggle. At under 1024 px the switch lives inside the Menu, so on a phone a user must open Menu first. Consider keeping the icon button visible in the header next to Menu.
6. `.resultSection:first-of-type` (ui.module.css) matches by element type, so any earlier `<section>` sibling breaks the zero top margin. Prefer a wrapper class or `:first-child`.
7. Dark mode: the faint "without premises" series (ordinal step #3470AA, 3.62:1) with a dashed hollow marker reads weakly on #0F1216 at the fold. It passes the 3:1 rule but is the weakest element in the dark shots; give it a slightly larger marker or stroke in specs.
8. `.withToc` still has the 220 px column (ui.module.css); the plan replaces it with the aside "On this page" list. Make sure that is done in R3, not left as a second narrow column.
9. The legend is two rows and about 130 px tall above the chart at 1280, so the chart is partly below the fold at 800 px high. R2's header, dek and figure must fit: H1 (2 lines), one-line dek, then the figure title; keep the legend inside Figure under the title.
10. Gaps: header margin-bottom `space-7` plus tab bar gives a large gap before the figure at 1280. Fine now, but check the 10-second rule when R2 adds KeyPoints beside the figure.

## Spread risks if every page adopts these foundations
- The h2-as-sentence rule combined with 28 px (finding 1) is the biggest readability risk on mobile.
- Anything using a fixed two-column grid inside the aside (finding 2).
- Static chart size versus slot size (finding 3), more visible on Explore and Overview, which have different slots.
- Magnitude ramp: every heat map must use cell borders and value labels (documented), or the low end disappears on both themes.

## Verdict
GATE A: GREEN. The scale, container, contrast, touch targets and theme switch are sound and consistent across 375, 1280 and 1440, with no horizontal overflow. The open items are tweaks (mobile h2 step, StatGrid inside the aside, prerender widths) that R2 can absorb without rework; none makes building ResultSection pages on these foundations wasteful or wrong.
