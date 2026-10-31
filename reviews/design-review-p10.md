# Gate C: design review of the P10 redesign (all routes)

Evidence: reviews/shots/r4/{overview,explore,explain,predict,paper,methods,about}-{1280,375}-{light,dark}-fold.png and -light-full.png (all viewed; dark 375 viewed for overview and about only, dark 1280 for overview, explore, explain, predict, paper). Earlier gate shots were not re-opened; Gate A and B status comes from the findings files and R3b's report. Not available: 1440x900 and 768 sets, any 3D-mode shot, any open Data menu, the mobile Menu open (so theme switch on phones is judged from the closed state only), the Explore filter sheet. I do not guess about those.

## 10-second test
| Page | 1280x800 | 375x812 |
|---|---|---|
| Overview | Pass. H1 plus a 4-bar chart with the 0.197 to 0.593 gap and the left stat list. "Premises" is not plain English, but the chart labels it ("+ premises and location"). | Pass on layout (chart top y=359, all four bars in view). The finding reads from the chart, not the words. |
| Explore | Pass. H1, map with two bright downtown clusters, hour bars with a darker 18:00 bar. | Partial. Map is in view, the hour chart is two scrolls away, so "evening" is not on the fold. Acceptable, as noted at Gate B. |
| Explain | Partial. H1 is about post-2019, the main visual is the by-hour plot, which is about something else (h2 "hour of day moves the odds most"). The 0.55 card ties back, but a reader sees two claims. | Weak. 4-line H1, 5-line dek, 3-line h2, 3-line caption, then the plot at y=675. About 135 px of plot on the fold, no 0.55 card. Rule technically met, spirit not. |
| Predict | Pass on words. The chart is cut at the fold (fourth rung partly below) and has no x-axis or legend on the fold, so unlabeled grey ticks and filled-versus-hollow markers are unexplained until a scroll. | Weak. Chart body starts at y=629 below a 5-line h2; about 180 px of chart on the fold, two of four rungs. |
| Paper | Pass. H1 plus "In brief", Download card. | Pass (card at y=334) but the H1 claim is covered only by text. |
| Methods | Pass. H1 plus the sample-flow table. | Pass, but see S6 (TOC takes the fold). |
| About | Pass. | Pass. |

## Type, line length, container
- Scale holds on every page: h1 44 desktop and 34 phone (4 lines at most), h2 28 (24 on phone), body 18/17, captions 16, stat numbers about 32 to 56. No page uses a different size system. Overview H1 balances well in two lines; Explain and Predict H1s still leave a short last line ("a robbery.", "property crime.") (nit, carried from Gate B).
- Prose measure is about 68ch (Explain dek, Overview bullets, About). One 1280 container with a 32 px gutter on every page. Explore is the exception by design (nav at x=32 at 1440, trade-off already accepted).
- Explore header is visibly tighter than every other page: eyebrow, H1 and dek are stacked with about 4 px gaps and the H1 looks smaller than 44. It reads as a different template (see S4).

## Colour and contrast
- Light and dark are both clean: text, muted text, stat cards, callouts, chips are legible, no glare. Dark Overview bars (#8ab8ff-like on #0F1216) and the dark dashboard hold up. Primary button in dark (light blue with dark text) is fine.
- Colour is not the only channel on Predict (filled and hollow markers, legend), Explore trend (distinct dashes plus end labels), crime-type bars (direct labels), and Explain verdict chips (icon plus text). Overview "Guessing" tick is grey, a label names it.
- Weak spots: Predict dark hollow markers and short CI lines are thin on #0F1216 (Gate A nit 7 and Gate B nit, still open); Overview grey guessing ticks are low-contrast in dark.

## Components across pages
- ResultSection, StatCard, KeyPoints, Callout and Figure Data menu are used consistently on Explain and Predict. The Data button sits right of the figure title everywhere, the same size (44 px). Good.
- KeyPoints inconsistency: the number column is sized to its content, so wrapped text indents differently per row ("28 of 41" on Paper, "16.1%" on Overview, "-0.23"). Rows do not align on one text edge.
- Overview below-the-fold: the three "Three ways in" cards have unequal heights (Explore card shorter).
- Overview h2 "The robbery share fell after 2017" sits above a figure title that repeats the idea, while the bullet says "after 2019". Two different change points on one page read as a contradiction.

## Explore dashboard (1280, both themes)
- One screen, no page scroll to reach any control, except about 125 px to the footer. Fully legible: totals 25 px, map labels, chart text 14 px. The Union Station marker and the lighter basemap solve Gate B S4; the map is much quieter. Opaque clusters read well in both themes.
- Gate B S6 resolved (end labels, dash patterns). Over-time plot is small (about 100 px high) and its x labels are crowded; the 2020 to 2023 labels nearly touch.
- Legend under the map lists Bicycle theft, Robbery and Theft over in colour, but map clusters are coloured by count (yellow to blue), not by type. A reader will look for crime-type colours on the map. Needs a "cluster colour = number of records" cue next to the type legend, or move the type legend to the chart column.
- "distinct event IDs" and "records" are jargon for a general reader. The filter list's "Dates" heading is cut by the fade at the fold, signalling more filters; acceptable.
- At 375 the map is first and the chart cards stack in a clear order; Over time chart is narrow (plot about 150 px) because direct labels take the right third.

## Explain scatter (flat view, from the 1280 full page)
- Flat view is correct and legible: Moss Park labelled, axis titles with units, colour and size encode robberies, outlined markers. Colourbar is tiny (about 110 px wide, 12 to 14 px labels, top-left corner) and easy to miss. The "Rotate in three dimensions" button is a small blue pill below the chart, clear but isolated. Right aside on this section is a plain stat list, not StatCards, unlike section 1 (inconsistent with ResultSection, minor).
- 3D mode not in evidence; not judged.

## Gate A and B status
Resolved: A1 mobile h2 step (24 px), A2 stat cards stacked in aside, A3 slot-width prerender (no layout shift visible), B S1 (Predict 375 chart from y=731 to 629, Explain 725 to 675; improved but see S1 below), B S2 (empty space under Explain figure now small), B S3 (stacked table cards), B S4, B S5 (shellWide), B S6, B S7 (axis ticks thin at 375), B S8 (copy). Still open: A nit 5 (theme switch hidden in Menu on phones, no icon in the header), A nit 7 and Gate B nit on dark hollow markers, 3D income axis title collision (not visible here), Explain 375 chart height.

## Findings

### Blockers
None. No page is broken, clipped, overflowing or illegible in either theme at the two widths shown.

### Should-fix
- **S1. Predict and Explain 375 folds still show little chart** (predict-375-light-fold, explain-375-light-fold). Predict has a 5-line h2 and 2 rungs on the fold; Explain has about 135 px of plot. On phones hide the eyebrow, shorten the dek (Explain dek is the long honesty sentence), and cap h2 at 3 lines (or move the h2 under the figure on phones). Files: content/Predict.tsx, content/Explain.tsx, PageHeader and ResultSection in ui.module.css.
- **S2. Explain H1 and its main visual disagree** (explain-1280-light-fold). The 0.55 card is a column away from the by-hour chart that carries a different message. Lead the page with the post-2019 evidence (a small 2014 to 2023 odds or share-by-year figure, or move the 0.55 card above the hour section), or reword the H1 to the hour finding. File: content/Explain.tsx.
- **S3. Predict chart needs its axis and legend on the fold** (predict-1280-light-fold). Four rungs, unlabeled grey ticks and filled-versus-hollow dots have no key until below 800 px. Move the legend above the plot as a one-row key, shorten the figure by about 80 px (row spacing), and label the grey tick "guessing". Files: lib/specs.ts (predict ladder), content/Predict.tsx.
- **S4. Explore header is a different template** (explore-1280-light-fold vs others). Tighter spacing and smaller H1, no 8-column rhythm. This is defensible for fold fit, but make the type 44/34 at the same scale or document the exception in DESIGN.md. Files: explore.module.css header, PageHeader.
- **S5. Explore legend does not say what map colour means** (explore-1280-light-fold). See Explore section above. Files: explore/ExplorePage.tsx, MapView legend.
- **S6. Methods phone TOC and table** (methods-375-light-fold, -full). The "On this page" list wraps to a mixed row ("Models and evaluation   Explore counts" on one line, others stacked) and takes the whole fold under the H1; the two-column sample-flow table becomes nine stacked cards that repeat "Step" and "Count" and run about 900 px. Make the TOC a horizontal scroll strip or a Disclosure on phones; keep two-column numeric tables as tables (the card conversion should apply only when columns do not fit). Files: Methods.tsx, DataTable.tsx.
- **S7. Overview date contradiction** (overview-1280-light-full). h2 says 2017, bullet says 2019. Make the h2 and the odds bullet describe the same change, or label the 2019 line on the chart. File: content/Overview.tsx.
- **S8. Paper PDF preview is an empty grey panel** (paper-1280-light-fold and dark). About 700 px of blank card under the Download card. If headless Chrome just does not render PDFs, add a prerendered first-page PNG as a placeholder; otherwise users with the plugin disabled see a void. File: content/Paper.tsx.
- **S9. Phone theme switch** (all 375 shots). Still inside Menu. DESIGN.md says "one 44 px icon button", which is not true on phones. Keep the icon visible next to Menu. File: AppShell.tsx.

### Nits
- KeyPoints number column widths vary per row; align text on one edge (KeyPoints, ui.module.css).
- Overview "Time only" bar label touches the "Guessing: 16.1%" label (overview-1280-light-fold). Move the guess label to the axis end.
- Overview three cards unequal height; set equal height.
- Overview, Predict and Explain 1280: callouts sit in 8 columns with a blank right third (predict-1280-light-full; explain-1280-light-full "Associations among reported incidents", "weekday share" block with its right third empty). Span full width or put in the aside.
- Explain section 3 Segmented tab strip is wide and floats above a half-width chart.
- Explore "distinct event IDs" and "records" jargon; Explore trend plot small.
- Explain scatter colourbar tiny; aside there is not StatCards.
- Dark mode: Predict hollow markers and Overview guessing tick thin; Overview white CI whiskers on pale bars hide the interval inside the bar.
- Explain and Predict H1 last-line orphans ("a robbery."); use text-wrap: balance.
- No 1440 or 768 shots were supplied in r4; the S5 trade-off (nav at x=32 on Explore) should be re-checked at 1440 when the next set is taken.

## Summary
The system is coherent: one scale, one container, one component vocabulary, both themes clean, no overflow, touch targets 44 px in every shot. The results-first pages work on desktop. The weaknesses are phone folds on Explain and Predict (small chart presence), Explain's headline versus its first visual, the Predict chart's missing key on the fold, and several component-level inconsistencies that are cheap fixes. None blocks deployment preparation.

GATE C: GREEN
