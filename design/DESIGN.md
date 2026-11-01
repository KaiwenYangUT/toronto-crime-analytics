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
Inter 400/500/600 (self-hosted woff2, latin subset), tabular figures in tables and totals. P10 scale in
`tokens.json` (desktop, 768 px and up): xs 14 (chart footnotes only), sm 16 (captions, sources, tables, labels),
base 18 (17 under 768 px via `scale_mobile`), lg 22, xl 28 (h2), 2xl 34 (h1 on mobile), 3xl 44 (h1 on desktop),
display 56 (Overview stat numbers). Chart text: axis labels 14, axis and legend titles 15, title 20, text marks 14.
Prose measure 68ch, only inside text blocks. Source Serif 4 is for the paper only; the paper's figures use the
pinned `paper` theme block, so the larger site chart text does not move them.

## Colour
Neutrals and accent come in light and dark sets (text 7:1, muted 4.5:1). Categorical colours have a fixed
meaning everywhere (site, map, paper): robbery vermillion, auto theft blue, break and enter green, theft
over reddish purple, bicycle theft magenta (the ochre of the plan failed the colour-vision check against
robbery). Ordered rungs use a five-step blue ramp; map clusters use a cividis-like ramp. Colour is never the
only channel: charts add position, marker fill, dashes and direct labels.

## Layout
One container (`layout.page_max` 1280 px, gutter 32 px, 16 under 768 px) and a 12-column grid from 1024 px.
Three templates: **results page** (header, then `ResultSection` rows: figure over 8 columns and an aside of
stat cards, 2 to 4 bullets and the caveat over 4; stacked figure-first under 1024 px), **landing** (Overview:
answer and bullets over 5 columns, main visual over 7), and **dashboard** (Explore: filters 280, map 1fr,
charts 400, one screen at 1280×800). Touch targets are at least `layout.target` (44 px). Each page
carries a headline, a visual and 2 to 4 bullets; details sit behind `Disclosure`.

## Charts
Vega-Lite 6 with the generated theme. Marks take colour from the named styles `accent`, `accentOutline`,
`muted` and `ink` in the theme, so one spec serves light and dark. Every chart ships a prerendered SVG
(both themes, built in the route loader), swaps to the interactive view once it is near the viewport and the browser is idle, and has a
"View data table" toggle with the displayed (rounded) values, a CSV download and an SVG download.
Counts on a background use the magnitude ramp (`ramp.magnitude`, viridis: reversed in light so high counts are
dark, forward in dark so they are bright; end stops validated in `design/palette-validation.md`).

**3D exception (2026-10-31, user decision).** The neighbourhood scatter on Explain uses
`plotly.js-gl3d-dist-min` (chunk `plotly-gl3d.min-*`, own budget line in `tools/check_bundle_size.mjs`), lazy-loaded in its own chunk on that page only and never in the main bundle, with a
prerendered Vega-Lite flat view as first paint, fallback (no WebGL, reduced motion, load failure) and print
view. Scene colours come from the CSS variables and follow the theme live. No other chart uses Plotly.

## Components
`AppShell` (skip link, nav, theme switch, footer with build SHA), `PageHeader`, `ResultSection`, `StatCard`, `KeyPoints`, `Figure`,
`Callout` (info, caveat, warning, each with an icon and label), `DataTable` (sticky header, sortable),
`Disclosure` (deep-linkable), `Segmented`, `Legend`, `Num`. Explore adds `FilterPanel` (a left column on
desktop, a bottom sheet under 1024 px), `LiveTotals` (aria-live), `MapView` (MapLibre, self-hosted
Protomaps basemap, no labels so no glyph files are needed).

## Theme switch
One 44 px sun/moon icon button (`aria-pressed`, label "Dark theme"). Without a stored choice the theme follows
`prefers-color-scheme`, live. A click stores `light` or `dark` in `localStorage['tca-theme']`; clearing site
data returns to following the system. There is no separate "System" option.

## Spacing, shape, motion
4 px base (4, 8, 12, 16, 24, 32, 48, 64, 96), radius 6 px, borders instead of shadows, 2 px focus ring in
the accent colour, `prefers-reduced-motion` honoured. Breakpoints 375 / 768 / 1024 / 1280.

## Checks that run
`npm run lint` (ESLint and the numerals lint), `npm test` (Explore parity fixtures, results formatting,
URL state), `node scripts/smoke.mjs` (every route at three widths in both themes: console errors, one H1,
no horizontal overflow, zero serious or critical axe issues), `node tools/check_bundle_size.mjs`
(budgets of PLAN.md section 3.3; since P10 the shared core is 180 KB gzip and each route chunk 40 KB), Lighthouse on the gzip-serving local preview.
