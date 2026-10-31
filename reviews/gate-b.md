# Gate B: design lead review of R2 (Explore, Explain, Predict, 3D census scatter)

Evidence: reviews/shots/gateB/*.png, build/p10-reports/R2a-c.md. Not visible in any screenshot: the 3D control bar (Reset, Rotate, Zoom, Show 2D, Interact); the 375 fold crops of Explain and Predict (the "375" files are full-page, so fold positions come from R2b's measurements and the readable full-page views). Those items are judged from the reports only.

## 1. Ten-second test
- **Explore 1280x800: pass.** H1 "Reported incidents cluster downtown and peak in the evening." sits above a map with yellow clusters and an hour chart whose 18:00 bar is darker. Both halves of the claim are on screen.
- **Explore 375x812: pass for "downtown", partial for "evening".** H1 (4 lines), dek, Filters + totals, map top at y=420, so the map is above the fold. The hour chart is a scroll away.
- **Explain 1280x800: pass.** H1 plus the 0.55 StatCard (CI 0.52 to 0.58) are visible, and about 90% of the odds-by-time plot. Note the visible chart is about hour of day, while the H1 is about post-2019. The two claims compete, but the 0.55 card ties the H1 to a number.
- **Explain 375x812: weak.** H1 takes 4 lines, then dek, a 3-line h2, a 3-line figure title (Data button beside it), and the plot starts near y=572. The post-2019 card, the H1's evidence, is about a screen below.
- **Predict 1280x800: pass, with a loss.** H1, h2 with 0.197 to 0.531, the 0.593 card and 3 of the 4 rungs are in view. The "Full model without premises" rung (the premises contrast) is cut at 800.
- **Predict 375x812: fails the fold rule.** The chart body starts at y=731, behind H1, dek, a 3-line h2, the metric toggle, a 2-row legend and a figure title. The finding still reads in text (H1 and h2 with numbers), so the 10-second test passes on words only. The rule says the main visual is above the fold, so this is a real violation, but a cheap one (see S1).

## 2. Explore
- 1280x800 and 1440x900 both fit: filters (280, own scroll with fade, pinned Reset), map with totals strip, legend and note, trend, crime-type bars and hour bars. No scrollbar in the charts column. The page scrolls about 125 px only to reveal the footer, which is fine.
- 1024: two columns plus a "Filters" button; the left drawer is clean (dimmed page, "Show results", Escape and focus return). The third chart is clipped at 768 high, acceptable below 1280.
- 375: map above the fold and charts stacked below. "Over time" wraps to 2 lines beside D/W/M and Data (nit).
- Strong page. It is the most finished of the three.

## 3. Hierarchy, alignment, empty regions
Type scale and one-container behaviour hold. Two exceptions below (S2, S5).

## 4. Three-dimensional scatter
- **Legible in both themes.** Axis titles and ticks are about 14 to 16 px with units, the colourbar is labelled, and markers carry an outline. Low-end markers stay visible: yellow with a dark outline in light, dark purple with a pale outline in dark.
- Colour direction flips between themes (high is dark in light, bright in dark), as specified. The colourbar says which.
- Flat fallback is correct: same box, same data, Moss Park labelled, and a plain sentence says why rotation is off. The flat chart also encodes size and colour, so it is the better reading chart; the 3D adds depth but not new information.
- Mobile 3D (343 px): readable, with a horizontal colourbar; the cloud is a dense blob, but Interact gating prevents scroll hijack.
- Nits: the income axis title touches the 30k and 40k ticks in light, dark and mobile; the outlier (Moss Park) is unlabelled in 3D (hover only); `[class*="figureBody"]` hook should become a Figure slot.

## 5. Colour and contrast
- Text, cards, callouts and the verdict chips (icon plus text, not colour only) are fine in both themes.
- Hollow Predict markers are thin in dark (nit).
- Trend: bicycle theft (purple) and theft over (pink) are both dashed and close in lightness. The bars below are directly labelled with the same colours, so mapping is recoverable, but the trend has no in-chart label (S6).

## 6. Copy and honesty (for the audit)
No wording implies risk, safety or danger; "Counts, not rates", "not risk" and "reported incidents" are present on all three pages.
- Explain H1 "much less likely to be a robbery" is an adjusted odds ratio of 0.55, not a probability ratio. Check that "much" is defensible and that the dek's "association" caveat stays beside it.
- Explain h2 "course report's four patterns do not hold" versus the row "Robberies peak at weekends: Does not hold" whose own evidence says Friday and Saturday tie for the most robberies, and the chart below says Saturday has the highest share (about 20 vs about 15). A reader sees a contradiction. The "smooth curve" row's evidence ("rise 3 times between 1am and 11am and 7 times between 1pm and 11pm") is cryptic.
- Explain section 2 h2 "lower-income neighbourhoods reported somewhat more robberies": rho -0.23 is weak, and the scatter shows no visible trend. "Somewhat" is right; keep it.
- Predict H1 "The premises, not the time, separate robbery from other property crime" is partly built into the labels (the page's own callout says so). Consider "mostly" or point to the callout; flag for the audit.
- Predict h2 numbers 0.197 and 0.531 match the chart (grouped CV). The h2 should say grouped CV (the table does).

## Findings

### Blockers
None.

### Should-fix
- **S1. Predict 375 fold; Explain 375 near-miss.** Stack above the chart is h2 (3 lines) + toggle + legend + figure title + subtitle. On phones: drop the figure title when it repeats the h2, move the legend under the plot, shorten the h2 (mobile h2 is 24 px). At 1280 drop the "Dot: test score..." line so all four rungs fit in 800. Files: `ResultSection`/`Figure` in components/ui.module.css and Figure.tsx, content/Predict.tsx. Do this before R3, since Overview reuses the stack (H1, chart, bullets).
- **S2. Vacuum under the figure.** The aside is taller than the figure on Explain section 1 (about 300 px empty under the chart at 1280) and Predict section 2 (about 260 px). Make the aside shorter (put the bullets under the cards in one row, or let the callout span below both columns), or make the figure sticky or taller. Component: `ResultSection` grid. This affects every R3 page.
- **S3. Tables on mobile.** The Explain pattern table and the Predict "Two ways" table are clipped at 375 (Verdict and Evidence, or the PR-AUC columns, are off-screen behind a fade). Stack rows as cards under 600 px, or allow 2-line cells. Shared table component, which R3 Methods will reuse.
- **S4. Explore map is noisy.** Basemap roads are heavy in light and bright in dark, and clusters are semi-transparent, so lines show through the yellow circles. Lighten the basemap strokes (or lower contrast) and make cluster fills opaque. No "Downtown" or lake cue exists for a reader who must verify the H1; add a small label or Union Station marker. Files: explore/MapView.tsx, map style.
- **S5. Explore at 1440.** Header and nav sit in the 1280 container (left edge x=112) while the full-width grid and H1 start at x=32. Align the page header and footer with the dashboard (or cap the grid at 1280 plus margins). Files: routes/explore.tsx fullWidth handle, AppShell.
- **S6. Trend series.** Add end-of-line labels or a legend row, or differentiate theft over by something other than a similar-lightness pink dash. Files: explore/specs.ts.
- **S7. Explain mobile hour axis.** The three-panel odds chart at 375 packs hour, month and weekday ticks tightly (the letters nearly touch). Thin hour ticks to 0, 6, 12, 18 at narrow width. Files: lib/specs.ts `oddsByTime`.
- **S8. Copy mismatches above** (weekend row, chart message, "smooth curve" evidence): content/Explain.tsx. Resolve or reword before the honesty audit.

### Nits
- Explain H1 leaves "a robbery." alone on line 2; use balance or pretty. Predict H1 is similar.
- Explain section 3 Segmented control runs as a wide empty tab strip above the chart.
- Aside stats such as "-0.23" use a hyphen and no rho symbol label; use a true minus.
- 3D axis-title collision and the Figure slot hook noted in section 4.
- Predict hollow markers and "without premises" series are thin in dark.
- The census "Rotate in three dimensions" button sits below the fold at 1280x800 on Explain, which is fine.

GATE B: GREEN. Explore is a true one-screen dashboard at 1280 and 1440 with correct tablet and phone behaviour. Explain and Predict pass the 10-second test at 1280, and the 3D scatter is legible in both themes with a correct flat fallback. No finding makes R3 wrong, and each should-fix is a component-level tweak that R3 inherits automatically. S1 (Predict at 375, a fold-rule violation) and S2 (empty space under figures) are best done at the start of R3, before more pages adopt `ResultSection`; S3 before Methods' tables.
