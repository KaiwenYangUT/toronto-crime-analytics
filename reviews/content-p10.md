# Content design review, P10 (plain language)

Reader: a curious Toronto resident, no statistics training. Read-only review; nothing else was edited.
Sources: web/src/content/*.tsx, explore/ExplorePage.tsx, FilterPanel.tsx, state.ts presets, components/census/{CensusScatter.tsx,text.ts}, lib/specs.ts labels, prerendered HTML in web/build/client/toronto-crime-analytics/*/index.html.
Numbers in rewrites appear as {key}; all other digits are years or dates.
## 1. Words vs budget
Measure A = prose only (no charts, tables, collapsed panels). Measure B = every visible word except chart SVG (adds figure captions, table cells, stat cards). Collapsed Disclosure text is not prerendered, so B is a floor.

| Page | Budget | A | B | Verdict |
|---|---|---|---|---|
| Overview | 150 | 123 | 150 | At the limit on B. Adding the dek below needs offsetting cuts. |
| Explain | 350 | 326 | 527 (+~55 collapsed) | Over by ~180-230 on B. Blocker. |
| Predict | 300 | 200 | 369 | Over by ~70 on B (table headers, captions, cards). Should-fix. |
| Paper | 150 | 107 | 107 | OK |
| Methods | 450 | 360 | 418 | OK, but jargon-dense (see 4). |
| About | 120 | 116 | 116 | OK |

Explain cuts that recover the budget: shorten the four pattern "Evidence" cells to the figures only (~70 words), merge the two income callouts and the "Counts, not rates" callout into one line (~60), drop "What the original caption said" (~25, the Methods page can carry it), trim H2 3 (24 words) to ~14.
Predict cuts: shorten the two-designs table caption (32 words) and the importance key points.
## 2. Blockers

**B1. Explain: undefined core terms above the fold.**
The dek uses "adjusted odds ratios, not probability ratios" before "odds" or "adjusted" is defined. The only definition sits in a figure caption below, and it uses "odds" without explaining it.
Dek, new text: "Among {n} reported incidents from 2014 to 2023, we compare the odds of an incident being a robbery rather than another major property crime. Odds are robberies per other incident, so these figures show how the mix of crime types changed, not how risky a place is."
Figure caption, new text: "An odds ratio compares two groups: one means no difference, two means double the odds."
**B2. Predict H2 #1 is unreadable at a glance.**
Current: "In grouped cross-validation, premises and location type lift PR-AUC from {l1} to {l2}; time alone barely beats guessing." It has 26 words and three undefined terms (grouped cross-validation, premises, PR-AUC). The PR-AUC definition appears only in the caption under the chart.
New H2: "Knowing the type of place lifts the score from {l1} to {l2}; time alone barely beats guessing."
New dek (replaces "each scored two ways", which means nothing to a reader): "We tested computer models on {rows} reported incidents, once on neighbourhoods the model had not seen and once on later years. Each score runs from zero to one, where guessing scores the robbery share."
Carry "type of place" as the one name (see 6).
**B3. Explain card contradicts the claims table.**
The "After dark" card says {dark.or} times the odds. The claims table row says "Does not hold": {dark_share} of after-dark incidents were robberies against {light_share} in daylight, so the raw share is lower after dark. The card's "A small difference" does not say which way. A resident will see two opposite answers.
New card meaning: "Slightly higher once the hour is held fixed. The raw shares in the table below go the other way, because night hours differ in other ways."
Keep the "does not show that darkness explains robberies" note, and replace "explains" with "is why" for plain reading.
**B4. Overview and Explain headlines use different years.**
Overview H2 says "The robbery share fell after 2017". The Explain H1 and key finding say "after 2019". A reader will think one is wrong.
Overview H2, new: "The robbery share fell from about 2017; the Explain page compares 2014 to 2019 with later years." If the 2017 claim cannot be kept next to the 2019 split, use "The robbery share fell over the decade" and let the chart show the shape. Check the 2017 claim against the shareByYear data before the audit.
**B5. Share and score shown in different units side by side.**
Overview: "{pr_auc_L1} PR-AUC ... close to guessing at {prevalence}" and Predict cards "{pr_auc} PR-AUC ... Guessing scores {prevalence}". The score is shown as 0.197 and the guess as 16.1%. A reader cannot compare them. Display the guessing score in the same decimal form (0.161) wherever it sits next to a PR-AUC. This is a display-format change in results/index.json for the prevalence key, not a rounding change.
## 3. Should-fix (copy, with rewrites)

**Overview**
- No dek. Add: "Time of day barely helps tell them apart. The type of place does." (cut an equal number of words elsewhere).
- H1: "premises" is undefined. New: "Robbery or other major property crime? The type of place tells you far more than the time." ("major" matches the task definition; Predict H1 also drops it.)
- Key finding 2 reads as two clauses glued by a colon. New: stat {pr_auc_L1}, text: "From time alone, the model scores barely above guessing ({prevalence}). With the type of place and the rest, it reaches {pr_auc_L5}. Scores run from zero to one."
- Key finding 3, "{or} times the odds of a robbery after 2019", uses "odds" undefined. New text: "the odds of a robbery after 2019, compared with before. Odds are robberies per other incident."
- Key finding 4: sign and meaning unclear. New text: "A weak link: neighbourhoods with lower median income reported somewhat more robberies in 2020. Zero would mean no link."
- Figure subtitle "PR-AUC with 95% intervals, tested on held-out neighbourhoods. Grey ticks mark guessing." New: "Score from zero to one for four models, tested on neighbourhoods the model had not seen. Lines show the 95% interval; grey ticks show guessing."
- Lens text: "Which timing differences are statistically clear." New: "What changes the odds that an incident is a robbery." Predict: "How well a model tells the crime types apart." is fine.
- Chart title "Share of these reports that were robberies" uses "reports" and "these". New: "Share of reported major property incidents that were robberies, by year".
**Explain**
- Eyebrow "Explain · inference" and Predict "Predict · classification" are jargon. New: "Explain · what changes the odds" and "Predict · telling crime types apart".
- H1 "a reported incident was much less likely to be a robbery" can be read as "robberies fell". New: "After 2019, robbery was a smaller part of reported major property crime." The card already says the size depends on the comparison group.
- H2 1: "moves the odds" is jargon. New: "Hour of day matters most; month and weekday matter little."
- Cards show "Cluster-robust 95% CI". New: "95% interval, allowing for differences between neighbourhoods".
- Time format mix: "15:00", "1am to 11am", "Busiest hour: 15:00". Pick 12-hour with am/pm: "3 pm against noon".
- Income key points use "Rank correlation" and "p {p}". New point 1: "Across {n} neighbourhoods, lower median income goes with somewhat more robberies: a weak link, unlikely to be chance." New point 2: "The job ratio (jobs per worker) shows no link." Keep p-values in the data table.
- "What the original caption said ... Income holds, weakly; the job ratio is not supported." The reader has not met the course report. New: "The original course report expected low income and a high job ratio. We find a weak income link and no job-ratio link."
- Caveat callout "confounded" is jargon. New: "These are counts of reported incidents from the first pandemic year, not risk, so changes through the year may reflect the pandemic."
- H2 3 (24 words) and "course report's four patterns". New: "Four patterns from an earlier course report do not hold in the data." Evidence column keeps the figures; the Saturday exception moves to the weekend row.
- Weekend row: "Not on average:" is vague. New: "Not clearly: Friday and Saturday tie for the most robberies ({fri} and {sat}) and Sunday has the fewest ({sun}). Saturday does have the highest robbery share, {sat_share}."
- Hourly row pattern wording ("Counts fall steadily from 1am to 11am and from 1pm to 11pm") is unreadable. New: "Counts fall steadily through the morning and through the afternoon and evening."
- Disclosure title "Model fit and calibration". New: "How well the model's probabilities match what happened". Its paragraph uses "Five-fold cross-validation", "ROC-AUC", "standard deviation" in one 2-sentence block. New: "Tested on data it had not seen, the model ranks a robbery above another incident {roc} of the time, where guessing scores one half. That is a weak separation even though {clear} of {terms} time terms are statistically clear: many small, reliable differences do not make an incident easy to classify."
- Callout title "Associations among reported incidents" and text "The post-2019 term absorbs everything". New: "Everything that changed after 2019, including how crimes were reported, is folded into the after-2019 figure."
**Predict**
- Table header "Baseline" vs "Guessing" elsewhere; chart label "Baseline: share of robberies" and "Chance". Standardise on "Guessing" in the table, chart reference lines, captions.
- Names for the two tests are jargon: "Grouped CV", "Temporal holdout". New labels everywhere (legend, cards, tables, series): "Unseen neighbourhoods" and "Later years (2022 and 2023)". Short chart labels: "New neighbourhoods", "Later years".
- Card labels: "Full model, grouped by neighbourhood" -> "All information, unseen neighbourhoods"; "Full model, tested on 2022 and 2023" -> "All information, later years". Define once, in the first caption: "The full model combines time, type of place, location and census data, using XGBoost, a standard machine-learning method."
- ROC-AUC definition "how often a robbery is ranked above another incident" is incomplete. New: "ROC-AUC: how often the model ranks a robbery above a randomly chosen other incident; guessing scores one half."
- Table caption (32 words). New: "Scores from two tests. The later-years test is harder, so compare within a row. F1 balances catching robberies against false alarms; one is perfect."
- F1 header "Full F1, tuned". New: "F1 (balance of hits and misses)".
- Importance subtitle: "Drop in PR-AUC when one block of features is shuffled". New: "Score lost when one kind of information is scrambled so the model cannot use it."
- Importance key points: "{drop} of PR-AUC lost when premises and location type are shuffled." New: "{premises} of the score is lost when type of place is scrambled; {time} when time is; census and location cost less."
- Callout copy mentions "the second model's ROC-AUC" (L2, which the reader has never seen), "labels", and "classes". New body: "Some of this is built in: a break and enter happens inside a building, while a robbery is recorded outdoors or in a shop. Without the type of place, the ROC-AUC falls from {l2} to {l2_np}, so read these scores as what separates the crime types, not a prediction of future robberies." (Check the "outdoors or in a shop" claim against the premises counts; it is a stated fact without a number.)
- "All models" table rows show codes ("L2 + place", "L5 XGBoost, no premises"). New rows: "Time only", "Time and type of place", "Adds census", "Random forest", "XGBoost", each with "without type of place" variants. Also unify the chart label STEPS "+ premises and location" and RUNG_LABEL "+ place".
- Disclosure titles: "Precision-recall curves" is jargon. New: "Catching robberies against false alarms (precision and recall)". Its figure title is 18 words; shorten to "Only models that know the type of place rise well above guessing."
**Paper**
- H1 is good. "with 95% intervals that exclude no effect" misreads. New: "28 of 41 time effects are statistically clear" -> "{clear} of {terms} time effects are statistically clear: their 95% interval does not include no difference."
- "Models: A logistic regression and a five-step prediction ladder." New: "A statistical model of the odds, and five prediction models that add information step by step."
- "Findings" duplicates the H1; keep only the "Question / Data / Models" rows or add what the reader does next ("Read it in about 7 pages").
**Methods**
- "The task is P(robbery | reported incident)". New: "Given a reported incident, which major crime type is it: robbery, or one of the other three?"
- "Robbery is the positive class; ... negative class." New: "We compare robbery with auto theft, break and enter, and theft over. Assault, bicycle theft, homicide and shootings are left out by rule."
- "logistic regression ... standard errors clustered by neighbourhood (158 clusters)". New: "A statistical model of the odds of robbery, with margins of error that allow for neighbourhoods behaving alike ({n} neighbourhoods)."
- "bootstrap 95% intervals", "held-out" -> "intervals from repeating the test on resampled data" and "tested on neighbourhoods and years the model had not seen".
- "Files are checked against recorded checksums and never committed." New: "Raw files are not stored in the repository; each is checked against a recorded fingerprint before use."
- "Explore counts" lede: "checksummed data bundle ... original Shiny app". New: "The Explore page counts 2020 to 2023 records in your browser, from a data file checked against a recorded fingerprint. For the three course categories, its counts match the original course app exactly."
- "Corrections to the course models" lists internal course history (STA303, JSC370, tuning grid). Move into a collapsed block or About; the reader has not seen the course models.
- Limitations: "not adjusted for exposure" -> "do not account for how many people or properties are present".
**Explore (copy)**
- H1 "Reported incidents cluster downtown and peak in the evening." can read as "downtown is dangerous", and the third comprehension question requires "no". New dek: "Counts show where incidents are reported, which follows where people are and when. They are not rates per resident or visitor, and they are not a measure of risk."
- Preset button "Course report Figure 5: 2020 robberies" -> "2020 robberies (as in the original report)".
- Hint "The nearest listed station is one of the stations in this data, not necessarily the nearest station." is circular. New: "Distance is measured to the stations listed here, which may not include every nearby station."
- Details "records can exceed distinct event IDs" -> "One event can have several records, so there can be more records than events."
- "Records" (legend, tables, charts) vs "incidents" (headline) vs "reports". Use "incidents" in titles and keep "records" only where counting rows is the point.
## 4. Jargon audit (first use; where it is defined, if anywhere)
| Term | Where first met | Defined? |
|---|---|---|
| PR-AUC | Overview key finding | Yes there ("score from zero to one"); but Predict H2 and Explain use it first with no gloss |
| ROC-AUC | Predict cards | Only inside the toggle caption; incomplete |
| odds ratio / odds | Explain dek | Not before the dek; caption defines ratio but not odds |
| grouped cross-validation, temporal holdout | Predict H2, legend | No |
| baseline / chance / guessing | Predict | Three words for one idea |
| F1 | Predict table | No |
| cluster-robust | Explain cards | No |
| calibration | Explain disclosure | No |
| Spearman / rank correlation / top decile | Explain income | Rank correlation not defined; Spearman and decile appear only in keys |
| premises, location type | Overview H1 | No |
| MCI | none in copy | Good (keep out) |
| rung, L1, L5 | Predict "All models" table rows | Visible codes, never defined. Remove |
| XGBoost, random forest | Predict caption, Methods | No |
| job ratio | Explain H2 | Only in chart axis (permanent job to labour force) |
| post-2019 term/indicator | Explain callout, Methods | Plain "after 2019" is clearer |
## 5. Block length (two sentences maximum)
Over or at risk:
- Explain disclosure paragraph (two long sentences with a colon: reads as three).
- Predict callout (second sentence is 34 words with a colon).
- Overview key finding 2 (stat plus two clauses).
- Methods "Task" bullet 3 and "Models" bullet 3 are one sentence each but over 30 words with three or more nouns; split.
- Explain income key points: bullet 1 has a stat, a clause, a parenthesis; fine once p-values are moved.
Pass: Overview, Paper and About blocks; Explain dek (two sentences); Methods ledes.
## 6. Terms that differ across pages
| Concept | Variants found | Use |
|---|---|---|
| The unit | incidents / reports / records / crimes | "reported incidents" (Explore tables may say "records" with a one-time note) |
| Task group | other property crime / other major property crime / the other three | "other major property crime" |
| Premises | premises / premises and location type / + place / + premises and location / place | "type of place" (defined once: premises and location type in the police record, for example street, shop, house) |
| Guess | guessing / baseline / chance / robbery share | "guessing" (= the robbery share, say so once) |
| Time only | time only / time alone / Time | "time alone" in prose, "Time only" in labels |
| Tests | Grouped CV / grouped cross-validation / held-out neighbourhoods / grouped by neighbourhood; Temporal holdout / held-out period / tested on 2022 and 2023 | "unseen neighbourhoods", "later years (2022 and 2023)" |
| Best model | Full model / XGBoost / L5 / "the second model" | "full model (XGBoost)" first, "full model" after |
| Interval | 95% CI / 95% interval / robust 95% intervals / cluster-robust | "95% interval" |
| Post-2019 | after 2019 / post-2019 | "after 2019" |
## 7. Forbidden wording
No "safe", "danger", "cause" or "risky" in the source or built pages. "Risk" appears only as "not risk" / "not a measure of risk" (Overview, Paper, Explain x4, Methods x2, Explore, text.ts), which the rule allows. Watch these:
- "darkness explains robberies" (Explain card note): "explains" borders on causal; use "is why".
- "more likely after dark" (quoted claim in the table): fine because the verdict is "Does not hold" and the quoted text is attributed.
- Explore H1 "cluster downtown": covered by the dek rewrite above.
The sentence "robberies are mostly recorded outdoors or in shops" is a factual claim with no number behind it; confirm it from the premises counts or remove it.
## 8. H1 / dek / h2 chain
- Overview: H1 -> key findings -> "The robbery share fell after 2017" -> "Three ways in". Reads smoothly except B4 (2017 vs 2019) and the missing dek. 10-second test passes only once "premises" is plain.
- Explain: H1 (after 2019) -> H2 "hour matters most" -> H2 income -> H2 patterns. The H1 finding and the first H2 are about different effects, and the H1's number sits in a side card. Fine for a result page, but the dek should say "the biggest single effect is the hour of day" so the chain is H1 (after 2019) -> hour -> neighbourhoods -> patterns.
- Predict: H1 (premises, not time) -> H2 1 (the score lifts) -> H2 2 (the model leans on premises). H2 2 repeats H1. New H2 2: "Scrambling the type of place costs the model most; scrambling time costs little."
- Paper: H1 reads well and matches the key points. Methods and About: H1 sentences are fine; About "rebuilt as one checked analysis" -> "rebuilt as one analysis, checked against the originals" (nit).
- Headings that are not plain sentences (nit unless noted): "Three ways in", "Inside the paper", "In brief", "Counts, not rates", "Associations among reported incidents", "Model fit and calibration" (should-fix, above), "Precision-recall curves" (should-fix), "All models and both designs", "Show all model terms", "Reported incidents in one year", "What the original caption said" (should-fix), eyebrows "Explain · inference" and "Predict · classification" (should-fix).
## 9. Nits
- Overview closing line "The full method and results, in a short paper." could be "Read the full method and results in the paper."
- "Details" toggle on stat cards: label "What this does not mean" is clearer than "Details".
- Dates written "2014 to 2023" and "2022 and 2023" are fine; keep one pattern ("2014 to 2023").
- About: "either organization" is ambiguous with three credits; name them ("not endorsed by Toronto Police Service or the City of Toronto").
- Explain "Counts, not rates" and "Reported incidents in one year" callouts say the same thing twice; one line suffices.
