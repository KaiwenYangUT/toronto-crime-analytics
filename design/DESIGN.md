# Design system

One system for the site, the map, the charts and the paper's figures. Tokens live only in
`design/tokens.json`; `tools/gen_tokens.py` generates `web/src/styles/tokens.css`,
`design/vega-theme.json` and `paper/generated/colors.tex`. Palette checks are in
`tools/check_palette.py` (report: `design/palette-validation.md`).

## Principles
- **The H1 is the finding**, in one sentence, with no numerals unless they come through `<Num>`.
  The main visual starts above the fold at 1280×800 and 375×812.
- **No number without a source.** Numbers render through `<Num k="results.key:path">`; a missing value
  or display format fails the build. Copy in `web/src/content` is linted for literal numerals
  (`web/scripts/check-content-numerals.mjs`). Explore counts are the one exception: they are computed
  in the browser from a checksummed bundle and the page says so.
- **Honest wording.** The task is P(robbery | reported incident). Copy never says risk, safety or cause.
  Findings carry a "what this does not mean" line.

## Type
Inter 400/500/600 (self-hosted woff2, latin subset), tabular figures in tables and totals. Scale in
`tokens.json` (major third from 16 px): xs 12.8, sm 14, base 16, lg 20, xl 25, 2xl 31, 3xl 39, display 48.
Prose measure 68ch. Source Serif 4 is for the paper only.

## Colour
Neutrals and accent come in light and dark sets (text 7:1, muted 4.5:1). Categorical colours have a fixed
meaning everywhere (site, map, paper): robbery vermillion, auto theft blue, break and enter green, theft
over reddish purple, bicycle theft magenta (the ochre of the plan failed the colour-vision check against
robbery). Ordered rungs use a five-step blue ramp; map clusters use a cividis-like ramp. Colour is never the
only channel: charts add position, marker fill, dashes and direct labels.

## Charts
Vega-Lite 6 with the generated theme. Marks take colour from the named styles `accent`, `accentOutline`,
`muted` and `ink` in the theme, so one spec serves light and dark. Every chart ships a prerendered SVG
(both themes, built in the route loader), swaps to the interactive view when the browser is idle, and has a
"View data table" toggle with the displayed (rounded) values, a CSV download and an SVG download.

## Components
`AppShell` (skip link, nav, theme toggle, footer with build SHA), `PageHeader`, `FindingCard`, `Figure`,
`Callout` (info, caveat, warning, each with an icon and label), `DataTable` (sticky header, sortable),
`Disclosure` (deep-linkable), `Segmented`, `Legend`, `Num`. Explore adds `FilterPanel` (a left column on
desktop, a bottom sheet under 1024 px), `LiveTotals` (aria-live), `MapView` (MapLibre, self-hosted
Protomaps basemap, no labels so no glyph files are needed).

## Spacing, shape, motion
4 px base (4, 8, 12, 16, 24, 32, 48, 64, 96), radius 6 px, borders instead of shadows, 2 px focus ring in
the accent colour, `prefers-reduced-motion` honoured. Breakpoints 375 / 768 / 1024 / 1280.

## Checks that run
`npm run lint` (ESLint and the numerals lint), `npm test` (Explore parity fixtures, results formatting,
URL state), `node scripts/smoke.mjs` (every route at three widths in both themes: console errors, one H1,
no horizontal overflow, zero serious or critical axe issues), `node tools/check_bundle_size.mjs`
(budgets of PLAN.md section 3.3), Lighthouse on the gzip-serving local preview.
