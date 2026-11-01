# Honesty re-check P10b (owner-feedback round: af0ac8d, 50e828e; HEAD fc8b0f8)

Auditor: read-only. Scope: `web/src/content/{Explain,Predict,Overview}.tsx`, `web/src/components/census/text.ts`, `web/src/lib/specs.ts`, `results/predict/predict.census_scatter.json`.
Evidence read: `results/index.json`, `design/display_formats.json`, `results/explain/explain.sta303_v2.json`, `results/predict/predict.{ablation,census_scatter,eda_corrections,inference_vs_prediction}.json`, `pipeline/src/tca/predict/{ablation,inference_vs_prediction}.py`, `pipeline/src/tca/explain/census_scatter.py`.

Abbreviations: ABL = predict.ablation, A = `A_neighbourhood_grouped_5fold_cv` (new neighbourhoods), B = `B_temporal_holdout...` (later years), CS = predict.census_scatter, S = explain.sta303_v2, EDA = predict.eda_corrections.

## Checks 1, 4, 5 and the audit script

1. Num keys: every `<Num k>` in the three files maps to a path present in the results JSON and to a format in `results/index.json` or `design/display_formats.json` (index paths checked by hand; CI was green on 50e828e, and a missing key or format fails the build). Formats match what the sentence says except the two noted below (cv.auc_mean shown as 0.631 under "of the time"; permutation drops shown as bare 0.414 / 0.071 under "of the score").
4. Literal numerals in `web/src/content` (Explain, Predict, Overview): none except years, "2020 to 2023" style dates, "95%" (interval level label) and ids. Structural counts are spelled out as words, not numerals ("five-fold", "ten groups", "four models", "five groups", "three comparisons"); these are label-like, not from results, and match the pipeline (cv.folds 5, 10 calibration deciles, 4 STEPS). OK.
5. "the course report" / "original report" / "original": no occurrence in Explain.tsx, Predict.tsx or Overview.tsx. The only residue is `census/text.ts:33` "from the course extract" (screen-reader text), see minor fix M9.
- `python tools/audit_numbers.py` was NOT run. It reads `web/build/client/<route>/index.html` and `paper/build/paper.pdf`; the existing `web/build/client` is stale (dated Oct 31 18:53, before af0ac8d at 21:41, no per-route index.html). It needs a fresh `make web` which this brief forbids.

## Claim table

| # | Claim (short) | Location | Evidence | Verdict |
|---|---|---|---|---|
| 1 | Explain H1 "Robbery was a smaller share ... after 2019" | Explain.tsx:63 | S:prevalence_by_year 2014-2019 15.9-22.0%, 2020-2023 10.5-13.8%; S:post2019.or 0.5465 | ok |
| 2 | "Drop is biggest against auto theft, smallest against break and enter" | Explain.tsx:74 | S:composition.Auto Theft.post2019.or 0.337; Theft Over 0.614; Break and Enter 0.813 | ok |
| 3 | StatCard 0.55 (95% interval 0.52 to 0.58) | Explain.tsx:93-99 | S:post2019.or 0.5465 -> 0.55; robust_or_lo 0.518, robust_or_hi 0.5765 -> 0.52, 0.58; post2019 = year >= 2020 (sta303_v2.py:50) | ok |
| 4 | Auto thefts 4,734 (2019) to 10,842 (2023); robberies 2,747 to 2,347 | Explain.tsx:114-115 | S:category_by_year | ok |
| 5 | "Hour matters most; month and weekday move the odds much less" | Explain.tsx:121 | S:hour_or_vs_12 range 0.478-2.361; month_or_vs_jan 0.834-1.015; weekday_or_vs_mon 0.970-1.130 | ok |
| 6 | "x2.36 at 3pm vs noon, the largest hourly ratio" | Explain.tsx:151 | S:hour_or_vs_12.15.or 2.361 is max of all hours | ok |
| 7 | "December is lowest at x0.83" | Explain.tsx:152 | S:month_or_vs_jan.12.or 0.8335 is min of months | ok |
| 8 | "Month and weekday ratios sit closer to one" | Explain.tsx:152 | weekday max 1.13, month min 0.83; both far closer than hours | ok |
| 9 | Noon caption: 11.4% (noon) vs 19.6% (11am) of 2020 incidents were robberies; "unusual reference hour" | Explain.tsx:136 | EDA:claims.hourly_shape.robbery_share_by_hour.12 = 0.1138, .11 = 0.1961; year 2020. Model also has hour 11 OR 1.259 and hour 13 OR 1.393 vs noon, so noon is low in the full data too | ok (2020 labelled) |
| 10 | Dark StatCard 1.14, interval 1.06 to 1.22 | Explain.tsx:139-142 | S:dark.or 1.138; robust 1.0597 to 1.2226 | ok |
| 11 | "A plain night-versus-day split of the raw data shows 16.4% and 17.2%" | Explain.tsx:145 | EDA:claims.darkness dark_share 0.1641, light_share 0.1725; 2020 extract only (16,611 rows), 18:00-06:00 clock rule | wording risk (see B4) |
| 12 | "...because night and day differ in other ways" | Explain.tsx:145 | No result isolates a cause; the EDA file only reports the two shares | unsupported (B4) |
| 13 | Fit list: AUC 0.631 "of the time", guessing one half | Explain.tsx:162 | S:cv.auc_mean 0.6312 (format decimals 3, not percent) | ok, format wording (M5) |
| 14 | "Of 41 time terms, 28 are statistically clear (95% interval excludes no difference)" | Explain.tsx:165 | inference_vs_prediction time_terms 41, time_terms_clear 28; clear = cluster-robust interval excludes 1 (hour+month+weekday+darkness, post2019 excluded) | ok |
| 15 | "These splits are not grouped by neighbourhood, so the score is not comparable with the Predict page" | Explain.tsx:168 | S:cv uses random 5-fold; ABL design A is neighbourhood-grouped | ok |
| 16 | Calibration title "Predicted probabilities match the observed robbery share" | Explain.tsx:173 | S:calibration_deciles mean_predicted vs observed differ by <= 0.008 in all ten groups | ok |
| 17 | Income H2 "In 2020, lower-income neighbourhoods reported more robberies" | Explain.tsx:198 | CS:summary.spearman_income rho -0.23, p 0.0036; income_bands median 20.0 (lowest fifth) vs 9.5 (highest); mean falls 20.8 to 13.2 monotonically | ok (counts, caveat present) |
| 18 | "the job ratio shows no consistent pattern" | Explain.tsx:198, 235 | CS:spearman_ratio rho 0.07, p 0.35; ratio_bands medians 12.0, 15.0, 16.0, 16.0, 15.0; means 16.1, 17.4, 19.2, 16.0, 19.3 | ok |
| 19 | "median count falls from 20.0 in lowest-income fifth to 9.5 in the highest" | Explain.tsx:219-223 | income_bands.0 and .4 median_robberies = 20, 9.5. Middle fifths 15.5, 12.0, 16.0, so it does not fall steadily | wording risk (M1) |
| 20 | "median is 12.0 in the lowest fifth and 15.0 to 16.0 in the other four" | Explain.tsx:229 | ratio_bands.0 = 12; others 15, 16, 16, 15. Keys used (.1 and .2) happen to be the min and max (15, 16), but the code hard-codes them | ok today, fragile (M2). text.ts:35 correctly uses min/max |
| 21 | "highest counts occur at every ratio" | Explain.tsx:229 | every ratio fifth max_robberies >= 47 (55, 87, 135, 47, 76) while top-decile threshold is 32 (CS:summary.top_decile.threshold); top 16 neighbourhoods fall in all five ratio fifths | ok |
| 22 | "Largest counts are a few central neighbourhoods: Moss Park (135) and Downtown Yonge East (87)" | Explain.tsx:236 | CS:summary.max 135; points[36].robberies 87; 3rd is West Humber-Clairville 76 (Etobicoke) | ok numbers; "central" not in any results file (M3) |
| 23 | Note: "all 158 neighbourhoods ranked, then cut into five groups of about equal size" | Explain.tsx:245 | Groups are value-quantile bands with ties kept together (census_scatter.py): n = 33, 30, 33, 32, 30 (income) and 32, 31, 32, 31, 32 (ratio). An equal-count rank split gives different middle medians (income 20, 15.5, 15, 12, 10) | wording risk (M4) |
| 24 | "2020 extract has 2,779 robberies, more than the 2,100 in the cleaned table" | Explain.tsx:252 | CS:summary.total_robberies 2779 (= sum of points); S:category_by_year.2020.Robbery 2100 | ok |
| 25 | "Counts of reported incidents, not per resident and not risk" | Explain.tsx:253 | task wording; no risk/causal wording | ok |
| 26 | 3D guide (robbery count is the upright axis; Rotate, Reset view, Interact buttons) | Explain.tsx:203-205 | CensusScatter.tsx:211-229 buttons exist; scene.ts z = robberies (not re-verified line by line) | ok (UI, not numeric) |
| 27 | Scatter alt text: income and ratio band medians, "no steady pattern" | text.ts:33-35 | same fields as rows 17-20; min/max over bands 1-4 gives 15.0 to 16.0 | ok |
| 28 | Alt text: "top tenth ... median income 35,000 vs 39,200 in the rest" | text.ts:36 | CS:summary.top_decile.median_income 35000, rest 39200, n 16 | ok |
| 29 | Predict H1 "Type of place separates robbery from other major property crime far more than time" | Predict.tsx:108 | ABL A: L2 PR-AUC 0.531 vs L1 0.197; premises permutation drop 0.414 vs time 0.071 | ok |
| 30 | "Type of place lifts the score to 0.531; time alone is only modestly above guessing" | Predict.tsx:116 | ABL A L2 pr_auc 0.5314; L1 0.197 vs 0.161 baseline | ok |
| 31 | Caption: "On ROC-AUC every model scores higher than on PR-AUC" | Predict.tsx:144 | all 10 variants x 2 designs have ROC-AUC > PR-AUC | ok |
| 32 | "Guessing scores the robbery share: 0.161 and 0.110" | Predict.tsx:154 | ABL L0.pr_auc_baseline 0.1613 (A), 0.1103 (B) = prevalence | ok |
| 33 | StatCard full model A: "Far above guessing at 0.161; interval 0.564 to 0.618" | Predict.tsx:168 | L5 A pr_auc 0.593 (0.564-0.618) | numbers ok |
| 34 | "...is the range another sample of incidents would likely give" | Predict.tsx:168 | ABL:evaluation.confidence_intervals: 95% cluster bootstrap over neighbourhoods. It is not a range for another sample of incidents | wrong (B3) |
| 35 | StatCard full model B: 0.435, "guessing is lower too at 0.110; interval 0.406 to 0.463 just as tight and sits well below the first test's" | Predict.tsx:178 | widths 0.057 (B) vs 0.054 (A); B hi 0.463 < A lo 0.564 | ok |
| 36 | StatCard time only A: "A little above guessing at 0.161 ... interval stays above the guessing score" | Predict.tsx:188 | L1 A pr_auc 0.197 (lo 0.179 > 0.161). Also true for B (lo 0.126 > 0.110) and ROC (lo 0.579 > 0.5) | ok |
| 37 | "...hour, weekday and month say something about which crime it was" | Predict.tsx:188 | L1 block also contains the darkness flag (ablation.py:117); omitted but harmless | ok |
| 38 | Importance H2 and subtitle; "leans on type of place far more than time" | Predict.tsx:197 | ABL A L5 permutation drop: premises 0.414, time 0.071, census 0.022, geo 0.021 | ok |
| 39 | "0.414 of the score is lost when type of place is shuffled" | Predict.tsx:213 | The 0.414 is an absolute PR-AUC drop from 0.593, i.e. about 70% of the score. "0.414 of the score" reads as 41%. | wrong as read (B1) |
| 40 | "0.071 is lost when time is; census data and coordinates cost far less" | Predict.tsx:214 | A: census 0.022, geo 0.021 vs time 0.071 (3x smaller). In B: census 0.037, geo 0.032 vs time 0.063, which is not "far less", but the card is scoped to new neighbourhoods | ok in scope; same unit issue as row 39 |
| 41 | Caveat: "Without type of place, the time-and-place model's ROC-AUC falls from 0.836 to 0.599" | Predict.tsx:221 | ABL A L2 roc 0.836, L2-nopremises 0.599 | numbers ok; "time-and-place" is ambiguous since the no-premises model still has coordinates (M6) |
| 42 | "A break and enter happens in a building, so some of the lift is built in" | Predict.tsx:220 | definitional; consistent with ABL deltas L2 minus L2-nopremises 0.328 of L2 minus L1 0.334 | ok |
| 43 | Tables H2 "Later-years scores are lower, but the same models come out on top" | Predict.tsx:228 | PR-AUC lower in 9 of 10 models (L4-nopremises is higher: 0.245 B vs 0.225 A). ROC-AUC is HIGHER on later years for L2/L3/L4/L5 without type of place (0.610 v 0.599, 0.645 v 0.628, 0.713 v 0.630, 0.665 v 0.643) and about equal for L1 (0.586 v 0.588). Ranking: L4 and L5 top in both | wrong for ROC-AUC (B2) |
| 44 | Per-test paragraphs: full model 0.593/0.860, no place 0.242/0.643; later years 0.435/0.841, 0.202/0.665 | Predict.tsx:233-242 | ABL L5, L5-nopremises roc/pr estimates | ok |
| 45 | "PR-AUC is lower for nearly every model on later years, partly because robberies became a smaller share and guessing fell from 0.161 to 0.110" | Predict.tsx:251 | 9 of 10 lower (row 43); baselines 0.161 -> 0.110; "partly" is hedged | ok |
| 46 | "ROC-AUC reads higher for every model: 0.860 against 0.593" | Predict.tsx:258 | L5 A | ok |
| 47 | "Robberies are rare, so false alarms barely move ROC-AUC. PR-AUC counts them, so it is the stricter score." | Predict.tsx:259 | prevalence 16.1% / 11.0%; the ROC/PR relationship is standard | wording risk (M7) |
| 48 | "Both agree: time alone adds little (0.197 and 0.588) and type of place adds the most" | Predict.tsx:260 | ABL A L1; deltas L2 minus L1 0.334 vs L3 0.012, L4 0.050; same in B (0.221 vs 0.015 / 0.063) | ok |
| 49 | Curves H2 "Only models that know the type of place rise well above guessing" | Predict.tsx:268 | pr_curve: L1 precision 0.19-0.21 vs 0.161 (A); L2-L5 0.35-0.92. The charts plot only L1-L5, so the contrast is time-only vs the rest. The tables show no-place models too: A 0.202-0.242 (1.3-1.5x guessing), B 0.158-0.245 (up to 2.2x guessing, L4 without place) | wording risk (M8) |
| 50 | "In later years the curves start lower and the dotted line is lower too, at 0.110 against 0.161"; "The shapes match" | Predict.tsx:276 | pr_curve precision at recall 0.05: L2 0.909 (A) v 0.796 (B), L5 0.913 v 0.822; at recall 0.5: 0.52 v 0.31 | ok |
| 51 | Lede: "a curve that stays above [the dotted line] is useful" | Predict.tsx:269 | any model above prevalence is better than guessing; "useful" is a judgement | ok (mild) |
| 52 | Overview model list: "Time only: hour, weekday, month and whether it was dark" | Overview.tsx:25 | ablation.py:111-120 time block = hour/month harmonics, weekday dummies, dark | ok |
| 53 | "Time and type of place: adds premises and location type ... and coordinates" | Overview.tsx:26 | L2 = ("time","geo","premises") | ok |
| 54 | "Full model: adds neighbourhood census data and XGBoost" | Overview.tsx:27 | L5 = xgboost on time+geo+premises+census (random forest L4 skipped in the 4-bar chart, correct) | ok |
| 55 | "Full model, no type of place: the full model without premises and location type" | Overview.tsx:28 | L5-nopremises | ok |
| 56 | KeyPoints: 16.1% of 159,056 were robberies | Overview.tsx:57 | S:robbery_share 0.1613, S:n 159056 | ok |
| 57 | "PR-AUC from time alone 0.197: only modestly above guessing 0.161; full model 0.593" | Overview.tsx:58-63 | ABL A | ok |
| 58 | "0.55 times the odds ... 2020 to 2023 vs 2014 to 2019" | Overview.tsx:65 | S:post2019.or | ok |
| 59 | Income bullet: "20.0 robberies in a typical lower-income neighbourhood in 2020, against 9.5 in a typical higher-income one" | Overview.tsx:66-72 | CS income_bands.0 / .4 median_robberies. These are the lowest and highest fifths, not "lower"/"higher" generally; no counts-not-rates caveat in the bullet, but the page tail says it | wording risk (M10) |
| 60 | Callout "0.328 of the 0.334 gain from the first bar to the second comes from [type of place]" | Overview.tsx:75 | ABL A deltas L2_minus_L2-nopremises 0.328, L2_minus_L1 0.334; L2-nopremises minus L1 is 0.005 | ok |
| 61 | H2 "The robbery share has fallen every year since 2017" | Overview.tsx:105 | S:prevalence_by_year 21.6, 18.3, 15.9, 13.8, 12.0, 11.6, 10.5 (2017-2023); it also fell 2016 to 2017 (21.95 to 21.59) | ok (understated, true) |
| 62 | Task-definition wording / risk / safety / causality | all files | Explain dek and Overview tail say "reported incidents, not risk"; Predict says "telling types apart, not forecasting robberies". Only causal-sounding phrase is row 12. Predict has no explicit one-line task statement (P(robbery given a reported incident)) in its dek, only the Overview/Explain/Methods carry it | ok except B4; M11 |
| 63 | specs.ts `PLAIN_RUNG`, `NO_PLACE_RUNG`, `STEPS` labels, curve description "time-only curve sits only a little above the dotted line" | specs.ts:28-44, 250, 493 | labels match ablation.py rungs; curve claim = pr_curve rows (row 49-50) | ok. Note `NO_PLACE_RUNG.L2` = "Time and coordinates" is exact; `L3` "Plus census data, no type of place" is exact |
| 64 | `Callout "What is PR-AUC?"` "A score from zero to one for finding robberies without false alarms" | Predict.tsx:154 | plain-language gloss of area under the precision-recall curve | ok |

## BLOCKERS (4)

B1. Predict.tsx:213: "0.414 of the score is lost when type of place is shuffled." The 0.414 is an absolute PR-AUC drop (0.593 to about 0.179), roughly 70% of the score, but reads as 41%. Units mismatch understates the effect and conflates points with fraction.
Fix: `{stat: <Num .../>, text: ' PR-AUC points are lost when type of place is shuffled (from 0.593).'}` (use `<Num>` for 0.593 via L('L5',DESIGN_A,'pr_auc','estimate')) and for time: `' are lost when time is shuffled; census data and coordinates cost far less.'` with the stat label "PR-AUC lost".

B2. Predict.tsx:228: heading "Later-years scores are lower, ..." is contradicted by the ROC-AUC column in the table directly under it: the four no-type-of-place models score higher on later years (Time and coordinates 0.610 v 0.599; Plus census data, no type of place 0.645 v 0.628; Random forest, no type of place 0.713 v 0.630; Full model, no type of place 0.665 v 0.643), and Time only is about equal (0.586 v 0.588).
Fix: "Later-years PR-AUC is lower, but the same models come out on top." (and keep the PR-AUC sentence at :251, which is accurate: 9 of 10 models lower).

B3. Predict.tsx:168: "...is the range another sample of incidents would likely give, so the score is steady." Wrong description of the interval. ABL:evaluation.confidence_intervals says 95% cluster bootstrap over neighbourhoods; it is not a prediction range for another sample of incidents.
Fix: "The 95% interval, 0.564 to 0.618, comes from resampling whole neighbourhoods, and it is narrow, so the score is steady across neighbourhoods."

B4. Explain.tsx:145: "A plain night-versus-day split of the raw data shows robbery shares of 16.4% and 17.2%, because night and day differ in other ways." Two problems: the shares are from the 2020 extract only with a 18:00-06:00 clock rule (EDA:claims.darkness.note; EDA year 2020), not the 2014-2023 raw data; and "because ... differ in other ways" asserts a cause no result establishes (causal wording, which AGENTS.md forbids here).
Fix: "In the 2020 extract, a plain night (18:00 to 06:00) versus day split gives robbery shares of 16.4% and 17.2%. That split mixes hour of day with darkness, which the model separates."

## Minor wording fixes

M1. Explain.tsx:221 "falls from 20.0 ... to 9.5": middle fifths are 15.5, 12.0, 16.0 (not steady). Replace with: "The median count is 20.0 in the lowest-income fifth and 9.5 in the highest; the three fifths between are 12.0 to 16.0." (Spearman -0.23 supports the direction; the ends are robust to the tie rule, the middle ones are not, see M4.)
M2. Explain.tsx:229 hard-codes `ratio_bands.1` and `.2` as the min and max of the other four. Correct today (15.0, 16.0) but breaks if data change. Compute min/max as text.ts:35 does, or say "about 15 to 16 in the other four" via a derived key.
M3. Explain.tsx:236 "a few central neighbourhoods": nothing in the results says "central" (CS points have no location field) and the third-largest is West Humber-Clairville (76). Replace with "The largest counts are Moss Park (135) and Downtown Yonge East (87)."
M4. Explain.tsx:245 "ranked, then cut into five groups of about equal size": the bands are value-quantile bands with ties kept together (n 30 to 33), not a rank split; an equal-count split changes the middle medians (income 20, 15.5, 15, 12, 10 v stored 20, 15.5, 12, 16, 9.5). Replace with: "Fifths: neighbourhoods grouped by median income (or job ratio) into five groups of about equal size; tied values stay together." The headline end-to-end contrast (20 v about 9.5 to 10) holds under both.
M5. Explain.tsx:162 "ranks a robbery above another incident 0.631 of the time": add a format or reword: "On random five-fold splits, the model gives a robbery a higher score than another incident in 0.631 of pairs (ROC-AUC)." (Num format is decimals 3; do not switch to percent without a stored format.)
M6. Predict.tsx:221 "the time-and-place model's ROC-AUC" -> "the Time and type of place model's ROC-AUC" (the no-type-of-place variant still has coordinates).
M7. Predict.tsx:259 "Robberies are rare" -> "Robberies are a minority of incidents, so false alarms barely move ROC-AUC. PR-AUC counts them, so it is the harder score to do well on."
M8. Predict.tsx:268 "Only models that know the type of place rise well above guessing." -> "Models that know the type of place rise far above guessing; time alone barely does." (Tables show the no-type-of-place models are 1.3 to 2.2 times guessing, so "only" overreaches.)
M9. census/text.ts:33 "from the course extract" -> "from the 2020 neighbourhood extract" (the word "course" is project-internal; Explain no longer uses it).
M10. Overview.tsx:66-72 "a typical lower-income neighbourhood ... a typical higher-income one" -> "in the lowest-income fifth of neighbourhoods in 2020 (median count), against 9.5 in the highest-income fifth; counts, not rates."
M11. Predict dek (Predict.tsx:109) defines only "type of place". Add the task sentence once for the page: "Telling robbery from the other three major property crimes in reported incidents, 2014 to 2023: not risk." (Explain's dek is the model.)
M12. Explain.tsx:104/138 "the range the data reasonably support": acceptable; "range of odds consistent with the data" is more standard if edited anyway.

## Not verified

- `tools/audit_numbers.py` (needs fresh build, see above).
- Rendered output of the Num strings (checked from JSON plus formats, not from a built page).
- The two interactive (client-only) behaviours: ROC-AUC toggle chart, 3D view.
