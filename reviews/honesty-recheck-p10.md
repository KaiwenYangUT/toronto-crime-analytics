# Honesty re-check, P10 (after F1/F2/F3)

Read-only. Scope: the six content pages, `explore/{ExplorePage,FilterPanel,state}.tsx`, `lib/specs.ts`, `components/census/text.ts`. Values recomputed from `results/*.json` (`<Num k>` keys) and, for Explore, from `web/public/data/explore/legacy.bin` with the page's own Union Station coordinates. No file outside this one was touched; git was not run.

## 1. The 13 should-fix items

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Explore H1 overstated | **Resolved** | `ExplorePage.tsx:245` now names "robbery, bicycle theft and theft over"; dek `:247` says "default view, 2020 to 2023" and "late afternoon into the evening". Recomputed: 7,970 of 25,242 = 31.6% within 3 km; busiest hour 18:00 (1,738); hours 15-21 hold 41.5% vs 29.2% even; data span 2020-01-01 to 2023-12-31. Details text computes these live. |
| 2 | Explain H1 / comparator | **Resolved** | H1 `Explain.tsx:106` is the share statement. Unadjusted share 19.5% (2014-19) to 11.8% (2020-23); adjusted OR 0.55. First figure shows pooled and per-comparator ORs (0.34 auto theft, 0.61 theft over, 0.81 break and enter); h2 `:116` order (biggest auto theft, smallest break and enter) is right; card `:144-145` quotes 0.34 and 0.81 and names reporting changes. |
| 3 | Darkness contradiction | **Resolved** | Card `:185-186` says fixed-hour darkness, "table below uses a clock cut-off"; table row `:88` says "no clear difference ... clock cut-off, not measured darkness" (16.4% vs 17.2%, z about 1.4). See new issue N2 on the row wording. |
| 4 | "None of the four holds" | **Resolved** | h2 `:249` "in the 2020 data"; summer row adds July 0.99 vs January; callout `:263` titled "Counts from one pandemic year". |
| 5 | 2,779 vs 2,100 | **Resolved** | `:240`: course extract 2,779 (`census_scatter.total_robberies`) vs cleaned table 2,100 (`category_by_year.2020.Robbery`), "counts ... not rates or risk". Both values match the JSON. It does not say why they differ (nit N6). |
| 6 | Predict H1 absolute | **Resolved** | `Predict.tsx:68` "far more than time". Supported: permutation drop 0.414 (type of place) vs 0.071 (time), temporal 0.306 vs 0.063; time-only 0.197 vs L2 0.531; no-premises L5 0.242. |
| 7 | Overview partly-definitional caveat | **Resolved** | Callout `Overview.tsx:65-68`: 0.328 of the 0.334 gain (`deltas.L2_minus_L2-nopremises` vs `L2_minus_L1`, both PR-AUC, design A). Keys and quantities match. |
| 8 | Noon reference hour | **Resolved** | Caption `Explain.tsx:174`: noon 11.4% vs 11am 19.6% of 2020 incidents (`robbery_share_by_hour.12`, `.11`) - correct keys. |
| 9 | "month and weekday barely" | **Resolved** | h2 `:161` "move the odds much less"; `:193` December lowest at x0.83 (lowest of all month and weekday terms; Saturday 1.13 is the highest, not mentioned, fine). |
| 10 | 0.631 AUC folds | **Resolved** | `:289` "random five-fold (not grouped ...), not comparable with the Predict scores"; "many small differences" removed. |
| 11 | F1 optimism | **Resolved** | `Predict.tsx:147` table caption. |
| 12 | "downtown" alt text | **Resolved** | `specs.ts` census description now "The largest counts occur at a range of incomes; there is only a weak tendency ...". |
| 13 | "close to / barely beats guessing" | **Resolved** | "only modestly above guessing" on Overview `:50`, Paper `:42`, Predict `:80`; specs descriptions say "only a little above". Remaining grep hits: none. |

Nits 14, 21, 22, 23 also fixed (L2 relabelled "Time, place and coordinates" / "Time and coordinates"; Methods `:21` "rows of events"; `:84` "from the second step up"; Paper `:36` multiplicity note). Nit 18 (Overview does not say the fall is mostly a rising denominator) is still open but the h2 is about the share and Explain carries the story.

## 2. New claims introduced by the rewrites

Verified true:
- Overview H1 and Predict H1 (ablation: grouped CV L1 0.197, L2 0.531, L2-nopremises 0.202, L5 0.593, L5-nopremises 0.242; temporal L1 0.141, L2 0.362).
- Overview h2 `:86` "fallen every year since 2017": shares 21.6, 18.3, 15.9, 13.8, 12.0, 11.6, 10.5% (2017 to 2023), strictly falling each year. True (peak was 2016 at 22.0%, not claimed).
- Explain "28 of 41" / Paper stat: `time_terms_clear` 28 of 41 (includes post-2019 and darkness; "time terms/effects" is acceptable).
- Month/weekday: December 0.83, 5 of 11 month terms clear, 1 of 6 weekday terms; hours 0.48 to 2.36. "Much less" fair.
- "New neighbourhoods" = neighbourhood-grouped 5-fold CV (158 clusters); "later years" = train to 2021, test 2022-23. Labels fit the designs. Predict caption `:97` "built from 159,056 reported incidents" is exactly true only for the first test (second tests on 40,341 rows): nit N5.
- "Type of place" = premises + location type (Predict dek `:71`, Overview `:67`, Paper `:50`, Methods `:71`). L2 also contains coordinates; step label "Time and type of place" omits that (coordinates add about 0.005). Nit N5.
- Methods flow: 174,993 - 332 - 2,409 - 12,472 - 708 = 159,072; - 16 = 159,056. 158 neighbourhoods; robberies 25,657 = 16.1%.
- Explore: details wording ("records" vs "event IDs", cluster key thresholds 50/300/1,500 from `CLUSTER_STEPS`) consistent with F3's verification; presets, hint and chip labels now match their behaviour.
- No risk, safety, danger, causal or "explains" wording anywhere (grep clean; "risk" only in "not risk" and a code comment).

Spot-checks of `<Num k>` against sentences (27 checked, all point at the named quantity): `post2019.or` 0.55 and robust CI 0.52-0.58; `composition.Auto Theft/Break and Enter.post2019.or` 0.34 / 0.81; `category_by_year.2019/2023.Auto Theft` 4,734 / 10,842 and `.Robbery` 2,747 / 2,347; `hour_or_vs_12.15` 2.36; `month_or_vs_jan.7` 0.99 and `.12` 0.83; `dark.or` 1.14 (robust 1.06-1.22); `cv.auc_mean` 0.631; `time_terms_clear/time_terms` 28/41; `darkness.dark_share/light_share` 16.4/17.2%; `summer_share/winter_share` 14.1/20.2%; `weekend_peak.robberies_by_day` Fri 443, Sat 443, Sun 332; `hourly_shape.rises` 3 and 7; census rho -0.23 (p 0.004) and ratio rho 0.07; `summary.n` 158; `total_robberies` 2,779; Predict `guess()` 0.161 / 0.110; L1 0.197; L5 0.593 (0.564-0.618); L2 and L2-nopremises ROC 0.836 / 0.599; block drops 0.414 / 0.071; Overview D() 0.328 / 0.334; Methods `robbery` 25,657, `robbery_share` 16.1%, `log.*` flow rows.

## 3. New issues

| # | Rank | Where | Problem | Minimal honest rewording |
|---|---|---|---|---|
| N1 | **should-fix** | `Methods.tsx:30` H1 "One cleaned dataset of reported incidents feeds every result on this site." | False as written, and the Explain page itself says otherwise: Explore uses its own 2020-2023 files (includes bicycle theft, which is not in the four police files), and the neighbourhood scatter uses the 2020 course extract (2,779 robberies, not the cleaned table's 2,100). | "One cleaned table of reported incidents feeds the Explain and Predict results; Explore and the 2020 neighbourhood chart use their own course data files." (or: "...feeds the models") |
| N2 | **should-fix** | `Explain.tsx:88` darkness evidence "16.4% of incidents from 6pm to 6am, 17.2% by day" | Missing the verb, so it reads as the share of all incidents that fall at night. The numbers are the robbery share of incidents in each period (`darkness.dark_share`). | "Robberies were 16.4% of incidents from 6pm to 6am and 17.2% by day: no clear difference. ..." |
| N3 | **should-fix** | `Predict.tsx:133` "0.414 of the score is lost when type of place is scrambled" | Wrong-quantity reading: 0.414 is PR-AUC points (0.593 falls to about 0.179, roughly 70% of the score), not 41% of it. Same for 0.071. | stat 0.414: " PR-AUC points are lost when type of place is scrambled." / stat 0.071: " when time is; census data and coordinates cost less." |
| N4 | nit | `Explain.tsx:185-186` dark card | The 1.14 depends on the comparator like the post-2019 ratio does (1.18 vs auto theft, 1.22 vs theft over, 1.06 vs break and enter with an interval that includes 1); the card does not say so, though the page now teaches that point for the other card. Row 3 of the table and this card are reconciled but a reader may still see "1.14" vs "no clear difference" as a conflict. | Add to notMean: "The ratio is weaker against break and enter alone (1.06, interval includes 1)." (needs a Num key `composition.Break and Enter.dark.or`, exists) |
| N5 | nit | `Predict.tsx:97`; `specs.ts` STEPS `L2` label | "built from 159,056 incidents" is the first test only; "Time and type of place" omits coordinates. | "On new neighbourhoods, time alone scores 0.197"; label "Time, type of place and coordinates" (or note in caption). |
| N6 | nit | `Explain.tsx:240` | 2,779 vs 2,100 stated without saying why they differ (the page cannot say; the cause is not in the results). | Keep as is; optionally "the two sources were never reconciled". |
| N7 | nit | `Explain.tsx:263` "Changes through 2020 may reflect the pandemic", `:145` "such as reporting" | Hedged, no result supports a cause; closest thing to causal wording on the site. | "Changes through 2020 are confounded with the pandemic year." |
| N8 | nit | `ExplorePage.tsx:245` | "Downtown" (3 km of Union Station) and the 4.5% area baseline are defined only inside the Details box, so the H1 claim has no visible yardstick; the evening claim has its comparator, the downtown one does not. | Add to the Details sentence "(a 3 km circle covers about 4% of the city's area)" only if that figure is added to a results file; otherwise keep. |
| N9 | nit | `Explain.tsx:77-79` weekend row | Evidence shows Fri/Sat tie for most robberies but verdict is "Does not hold"; the contradicting numbers (weekend mean 387.5 vs weekday 400.8) are not shown. | Evidence: "...; weekend days average no more than weekdays." |
| N10 | nit | `Overview.tsx:45` | "159,056 reported incidents" - the four major property-type files only. | "reported major property incidents" |

## Could not verify
Explorer exact-match parity vs the course app (`Methods.tsx:95`), "a robbery with two offence types / a bicycle theft with two bicycles" (F3 states it was checked in raw files; I did not re-open them), author name, GitHub URL, licence wording.

**Verdict: all 13 first-audit should-fix items are resolved and the numbers/headlines now hold (Explain, Predict, Overview, Explore H1s all check out); 0 blockers, 3 new should-fix (Methods H1 "one dataset feeds every result", Explain darkness evidence missing "were robberies", Predict "0.414 of the score") plus 7 nits.**
