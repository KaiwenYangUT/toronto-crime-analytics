# PARITY

Evidence that each Python/TypeScript port matches the original R project (AGENTS.md rule 1). Tolerances are in PLAN.md §5 (P3, P4).
This file is built up phase by phase. P2 recorded the R reference (sections 1 to 3); P3 and P4 add the Python tables and ports (sections 1.5, 2.1, 3.1, 6, 7).

Reference machine: `Kevins-iMac.local`, macOS arm64, R 4.5.3, `TZ=America/Toronto`, `LC_ALL=en_CA.UTF-8`.
Packages: `parity/r/r_packages.lock.csv` (shiny 1.14.0, xgboost 1.7.8.1, caret 7.0-1, glmnet 5.2, rms 8.2-0, pROC 1.19.0.1, randomForest 4.7-1.2, gbm 2.2.3, rpart 4.1.24).
Source patches: `parity/r/PATCHES.md`. Raw inputs: `data/manifest.json`, all 8 checksums verified on this machine.

## 1. JSC370 (robbery classification)

### 1.1 Published vs R re-run

The re-run is the parity target (decision 2026-10-29). The published table (seven decimals) is stored alongside it.
Every one of the 30 metrics agrees with the published value at seven decimals (maximum absolute difference 0.0). Full rows: `parity/r_outputs/jsc370/published_vs_rerun.csv`; script `parity/r/compare_jsc370_published.py`.

| Model | Train acc. | Test acc. | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|
| GLM | .8382214 | .8324639 | .6756757 | .0294811 | .0564972 |
| Classification tree | .8417477 | .8342697 | .5916667 | .0837264 | .1466942 |
| Bagging | .9980218 | .8733949 | .6817420 | .4799528 | .5633218 |
| Random forest | .9973338 | .8836276 | .7723577 | .4481132 | .5671642 |
| Boosting (GBM) | .8395975 | .8338684 | .7631579 | .0341981 | .0654628 |
| XGBoost | .8879333 | .8430979 | .5993976 | .2346698 | .3372881 |

Each cell is both the published and the re-run value. Test confusion matrices (TN, FP / FN, TP) printed in the original match exactly:

| Model | Published = re-run |
|---|---|
| GLM | 4124, 12 / 823, 25 |
| Tree | 4087, 49 / 777, 71 |
| Bagging | 3946, 190 / 441, 407 |
| Random forest | 4024, 112 / 468, 380 |

GBM and XGBoost matrices were not printed in the original. Re-run values (TN, FP / FN, TP): GBM 4127, 9 / 819, 29; XGBoost 4003, 133 / 649, 199. Stored in `parity/r_outputs/jsc370/confusion_matrices.json` (counts column-major, rows = actual).

### 1.2 Split and collation experiment

`set.seed(123); sample(nrow(final_data), 0.7 * nrow(final_data))` gives n = 16,611 (train 11,627, test 4,984), test robberies 848, train robberies 1,931.
This matches the published test size and positives. Run under `LC_ALL=en_CA.UTF-8` and under `LC_COLLATE=C` (`LC_CTYPE=en_CA.UTF-8`): both give byte-identical `final_data` and the same split, so collation does not affect this data. The full re-run uses `en_CA.UTF-8`.
Records: `parity/r_outputs/jsc370/split_summary_collation_*.json`.

### 1.3 Settings the re-run actually used

| Model | Setting |
|---|---|
| GLM | binomial logit, 17 predictors; `Difference_in_Individual_Median_Average_Income` is aliased (NA coefficient) |
| Tree | `optimalcp` 0.0027965, pruned tree has 7 splits and 8 leaves |
| Bagging | 500 trees, `mtry` 17 |
| Random forest | 500 trees, `mtry` 4 |
| GBM | 100 trees, depth 1, shrinkage 0.1, `n.minobsinnode` 10, bag fraction 0.5 |
| XGBoost | caret default grid, 108 combinations, 10-fold CV; best: nrounds 150, max_depth 3, eta 0.4, colsample 0.8, subsample 1; the 40-row `tune_grid` defined in the source is not passed to `train()` (unused), as the inventory predicted |

Random-forest Gini importance, top five: Longitude, Latitude, Premises_Type, Hour, Month. Bagging top three: Longitude, Latitude, Hour.
Test-F1 order: random forest .5672, bagging .5633, XGBoost .3373, tree .1467, boosting .0655, GLM .0565. The tier partition needs the paired bootstrap and is computed in P4b.

### 1.4 Determinism
Two full knits give identical exports (see §4).

### 1.5 Python port vs R re-run (P4b)
Python trains on R's exported `train_data` / `test_data` and is compared with R's test matrices. Tolerances (PLAN.md P4): GLM identical matrix; other models test TP and FP each within max(10, 10% of R's count) and F1 within 0.04. Full numbers: `parity/reports/jsc370_port.json`; tests: `pipeline/tests/test_jsc370_port.py`.

| Model | Python TN, FP / FN, TP | R TN, FP / FN, TP | Result |
|---|---|---|---|
| GLM | 4124, 12 / 823, 25 | 4124, 12 / 823, 25 | identical; coefficients rtol 1e-11; aliased term the same |
| Tree | 4082, 54 / 765, 83 | 4087, 49 / 777, 71 | **TP outside** (83 vs 71), FP and F1 within |
| Bagging | 3949, 187 / 440, 408 | 3946, 190 / 441, 407 | within |
| Random forest | 4025, 111 / 465, 383 | 4024, 112 / 468, 380 | within |
| GBM | 4127, 9 / 819, 29 | 4127, 9 / 819, 29 | identical |
| XGBoost (single fit, SEED) | 4010, 126 / 616, 232 | 4003, 133 / 649, 199 | single fit outside (seed luck) |
| XGBoost (mean of SEED..SEED+9) | TP 215, FP 123, F1 .363 | TP 199, FP 133, F1 .337 | within |

*Tree row:* the Python tree is pruned at R's chosen cp (0.0027965) on a scikit-learn tree whose factors are ordered by response rate; it has 12 leaves (R: 8 leaves, 7 splits). R's full tree has 66 leaves, ours 150, so no pruning level gives exactly R's size.
Alternatives tried and rejected (none within tolerance on every count): alphabetical integer codes (TP 76, FP 38), a best-first 8-leaf tree, one-hot levels (TP 24), pruning to R's leaf count by Gini or error.

*XGBoost:* the fit is random (`colsample_bytree` 0.8) and R's seed cannot be replayed. The seed set SEED..SEED+9 was fixed before the comparison; the single fit with SEED itself (TP 232) sits above the range of the other nine (203 to 224), so the port is judged on the 10-seed mean. All 10 seeds give TP at or above R's 199, so a small systematic difference between xgboost 3.4 and 1.7.8 may remain.

*Importance:* bagging's top three (Longitude, Latitude, Hour) match R. The random forest's top three have Hour where R has Premises_Type (0.115 vs 0.113 Gini share, a near tie). Premises_Type and Season were fed as alphabetical integer codes (`character_as_codes=True`, per the plan). R's formula interface may have turned them into factors (`model.frame` converts character columns); the alternative, ordering levels by response rate, gives RF's R top three but misses RF's FP count (135 vs 112) and changes bagging's top three. Both variants are recorded in the report.

*Tier rule* (paired bootstrap, 1,000 repetitions, shared seeded indices): R and Python give the same partition, {random forest, bagging} > {XGBoost} > {tree} > {GBM, GLM}.

Chart data for the model charts is in section 7.

### 1.6 Python-tuned row (P4b)
Labelled separately from the faithful ports above: hyperparameters chosen by Python on the **training frame only** (test frame never read; a test shows the choice is unchanged when test labels are scrambled). Code: `tca.predict.tuning`; report `parity/reports/jsc370_tuned.json`; run `parity/compare/jsc370_tuned.py` (about 2.5 minutes).

| Model | Python's CV choice | R's choice | Test TP / FP / F1 (Python-tuned) | Faithful port (R's settings) |
|---|---|---|---|---|
| XGBoost | nrounds 150, depth 3, eta 0.4, colsample 0.8, subsample 1 (caret's 108-point grid, 10-fold accuracy 0.8559) | the same | 232 / 126 / .385 | 232 / 126 / .385 (same fit) |
| Random forest | mtry 2 (OOB accuracy .8847; mtry 4 is .8842, a tie) | mtry 4 (default) | 360 / 87 / .556 | 383 / 111 / .571 |
| GBM | 150 trees, depth 3 (5-fold accuracy .8482) | 100 trees, depth 1 | 106 / 65 / .208 | 29 / 9 / .065 |

Reading: Python's search lands on R's XGBoost setting exactly, and R's forest default is within noise of the OOB optimum. R's GBM was untuned stumps; allowing depth 3 triples its F1, though it stays in the lower tier. These are single-seed fits, so differences of a few counts are noise.

## 2. STA303 (logistic-regression inference)

Re-run of the original Rmd with export hooks only (`parity/r/PATCHES.md`). Exports: `parity/r_outputs/sta303/` (large files xz; `uncompressed.md5` lists the originals).

| Item | R re-run |
|---|---|
| Rows (n) | 174,976 (robbery 33,919; other 141,057) |
| Categories | Auto Theft 58,434; Break and Enter 70,143; Robbery 33,919; Theft Over 12,480 |
| AIC stepwise | keeps all 6 terms |
| BIC stepwise | keeps 4 terms: Presence_of_Sunset, Hour, Covid_Outbreak, Month |
| LRT (BIC vs AIC) | χ² 30.437 on 4 df, p = 3.99e-06 |
| AUC (unrounded) | 0.597875 (`lrm` C = 0.597875) |
| LASSO | `lambda.min` and coefficients in `lasso_*.csv`; `foldid` rebuilt by `set.seed(123); sample(rep(1:10, length = n))` and matches `cv.glmnet` (max \|cvm difference\| 2.2e-16) |
| Final-table model | Gaussian `glm` (the original's final table is accidentally a linear model; kept here, corrected in P5) |

VIF text check: the original prose says Month and Season GVIF is "around 1.84"; re-run GVIF is 1.836 (Month) and 1.839 (Season, 3 df). Consistent.
The original sentence "Presence_of_Sunset … close to 1" holds (1.019).

### 2.1 Python port vs R re-run (P4a)
Tolerances (PLAN.md P4): raw values rtol 1e-6; LASSO coefficients 1e-4; apparent calibration 1e-3, bias-corrected curve 0.02. Full numbers: `parity/reports/sta303_port.json`; tests: `pipeline/tests/test_sta303_port.py` (the LASSO test is marked `slow`).

| Item | Observed difference from R |
|---|---|
| Full-model coefficients, SE, z | 7e-14 (displayed 4 dp identical) |
| Deviance, AIC, BIC, log-likelihood | 2e-15 |
| GVIF (car::vif method) and GVIF^(1/(2 Df)) | 3e-15 |
| AIC stepwise / BIC stepwise terms | identical (6 of 6 / 4) |
| LRT chi-square, df, p | 2e-10, equal, 3e-9 |
| DFBETAS (max abs), DFFITS, Cook's distance | 5e-10, 6e-8, 6e-8 (R export is float32); top-20 index lists equal for all 11 vectors |
| Working residuals | 6e-8 |
| ROC thresholds / sensitivity / specificity, AUC | 9e-13 / 1e-16 / 0 / 2e-15; label "AUC = 0.60" equal |
| `lrm` statistics (L.R., C, Dxy, R2, Brier, g) | 1e-12 |
| Gaussian "final" table (coefficients, SE, t, AIC, BIC) | 1e-12 |
| Calibration: grid, apparent curve | 9e-13, 7e-12 |
| Calibration: bias-corrected curve | 0.0105 (fold draw differs; tolerance 0.02) |
| Calibration: printed n, mean abs error, MSE, 0.9 quantile | n equal, 1.6e-4 (tolerance 1e-3) |
| LASSO: lambda sequence (44 values), lambda.min | 3e-13, equal |
| LASSO: coefficients, linear predictor | 2.4e-5, 2.6e-5 (tolerance 1e-4) |
| LASSO: Covid1 minus Covid0 contrast | -0.568696 vs -0.568693 |
| LASSO: CV deviance curve (cvm / cvsd) | 3.7e-5 abs / 0.3% relative (glmnet's own convergence tolerance) |
| LASSO: zero pattern | equal; glmnet counts the collinear Covid_Outbreak1 dummy as non-zero once it holds about 1e-15 |

Method notes, all documented in the code: the logistic fit is R's `glm.fit` IRLS written out (R's starting values, epsilon 1e-8 stop, covariance and influence from the last weighted fit) because statsmodels converges further and misses R's standard errors by 1e-6; the LASSO is a proximal-Newton coordinate descent that follows glmnet's standardisation, lambda grid and early-stopping rule (stop when the explained deviance gains less than 1e-5, which reproduces R's 44-value path); the cross-validated optimism in the calibration uses folds drawn here, since rms's internal draw cannot be replayed.

Not yet done for 4a: chart aggregates for the Vega-Lite specs (influence plots, Q-Q, ROC, calibration and LASSO deviance curves).

## 3. Explorer (Shiny)

Re-run on a copy under `build/r-work/explorer` with no source patch.

| Item | Result |
|---|---|
| `tests/test_analysis.R` | 28/28 pass |
| `tests/test_shiny.R` (`testServer`, destination and station modes) | both modes pass |
| `scripts/build_data.R` twice | byte-identical RDS (md5 `72d62cfd1d8d7c32d8fe3b625d6f8dd1`) |
| Original RDS | not available anywhere (`data/processed` is gitignored upstream), so no comparison; the rebuild is the reference |
| Retained events | 25,242 (2020-01-01 to 2023-12-31) |
| `VALIDATION.md` values | Little Canada 300 m: 566 records / 563 IDs; Dundas Station 300 m: 702 / 697; robbery-only, all locations: 8,455. All reproduced. |
| Fixtures | 2,565 cases (`fixtures.json`, 2.37 MB), 100 with full arrays and CSV; smallest gap between a record's distance and a slider radius: 3.2e-5 m |

The source has no committed shinytest2 browser suite; a browser check is planned for P6.

### 3.1 Python data tables vs R (P3)
All four tables are built by `tca.build` and compared with the R re-run exports; tests in `pipeline/tests/`, comparison scripts in `parity/compare/`.

| Table | Result |
|---|---|
| `explore_legacy` vs R `crime.rds` events | 25,242 rows; all 10 columns equal; R's row order reproduced; coordinates bit-equal (0 ulp); per-file manifest equal |
| `sta303_legacy` vs R model frame | 174,976 rows; all 15 columns equal; coordinates bit-equal; class counts 33,919 / 58,434 / 70,143 / 12,480 |
| `jsc370_legacy` vs R `final_data` | 16,611 rows, 2,779 robberies, 158 of 158 neighbourhoods; full-row multiset equal and R's row order reproduced; census features relative difference 0 |
| `unified` | no R counterpart; 159,072 rows (2014 to 2023); ledger in `parity/reports/unified_ledger.json` |

### 3.2 TypeScript engine vs R (P4c)
`web/src/explore-engine` re-implements the original filter, period, haversine, daily and trend functions and the CSV export as pure functions over typed arrays (a clean reimplementation; no original code is copied). Tolerance: exact. Result: all 2,565 fixture cases are exact, on the R-CSV table and on the shipped binary bundle, including identical CSV bytes and identical NA positions. Bundle: 25,242 records, 681,534 bytes raw and 316,147 gzipped (budget 600 KB), float64 coordinates bit-equal to R's.

## 4. Determinism checks

| Run | Result |
|---|---|
| STA303, two knits | all 55 exported files and the HTML are byte-identical |
| Explorer RDS, two builds | byte-identical |
| Explore bundle, two Python builds | identical SHA-256 (tested) |
| JSC370, two full knits (including the xgboost grid) | all 23 exported files identical (MD5 of uncompressed content) |

## 5. Deviations and open flags
Parity has passed only when every deviation below is accepted in writing (AGENTS.md rule 2). **D1, D2 and D3 were accepted by the user in chat on 2026-10-29** (message "Accept D1–D3"), including judging XGBoost on the mean of the ten pre-declared seeds. D4 is a logged restyle. Remaining before the `parity-pass` tag: the P4 code review.

| # | Deviation | Size | Why it exists | Status |
|---|---|---|---|---|
| D1 | JSC370 tree: test TP 83 vs R 71 | 12 over a tolerance of 10 | scikit-learn cannot split factors by level subsets and grew a different tree than rpart (section 1.5) | accepted 2026-10-29 |
| D2 | JSC370 random forest: top-3 importance has Hour where R has Premises_Type | near tie, 0.115 vs 0.113 | factor handling in the forest (section 1.5) | accepted 2026-10-29 |
| D3 | JSC370 XGBoost single fit with SEED: TP 232 vs 199 | outside; 10-seed mean is within | R's seed cannot be replayed; judged on a fixed seed set | accepted 2026-10-29 (10-seed rule) |
| D4 | Colour restyle: Bicycle theft is deep magenta (was blue in the Explorer), Auto theft is blue, Theft over pink | see section 6 | Okabe-Ito hues re-assigned so that all pairs pass the colour-vision checks | none (logged restyle) |

Original captions the data contradicts are listed in `parity/inventory/*.md` and are flagged here when the charts are ported.

## 6. Design tokens and palette (P4d)
`design/tokens.json` is the single source; `tools/gen_tokens.py` generates `web/src/styles/tokens.css`, `design/vega-theme.json` and `paper/generated/colors.tex` (a test fails if they drift). `tools/check_palette.py` reproduces the dataviz validator and writes `design/palette-validation.md`; its numbers equal the skill's `validate_palette.js` (tested).

Result with all pairs compared (the categories appear together on the map): **no failing check in either mode**. Dark mode has no warnings. Light mode has one: Break and enter vs Theft over under deutan simulation, delta E 7.6 (target 8; floor 6). It is legal only with secondary encoding, which every chart provides (marker shape, direct label or legend, data-table view).

Changes from the planned starting palette, each forced by the validator: Bicycle theft moved from ochre `#8C6D1F` to deep magenta (light `#9B357F`, dark `#A53E88`) because ochre was 1.8 delta E from Robbery under protan simulation; Theft over is `#B87EB3` in dark mode (the light pink is too bright for the dark band); the pooled "Other" slate is a neutral exempt from the chroma floor (4.56:1 on white, 6.35:1 on dark). Robbery stays the only warm saturated hue (tested). Explorer's original colours (blue bicycle, orange robbery, green theft over) therefore change: logged here as a restyle (D4).

Ordinal ramp (ablation rungs) and the cividis-like density ramp are in the tokens; the ordinal ramp passes the monotone, step-gap, contrast and single-hue checks in both modes.

## 7. Chart checklist
The JSC370 refreshed-branch widgets (`scripts/build_visual_widgets.R`) and `variable.Rmd` were run unmodified in R (`parity/r/run_charts.sh`, two runs give identical data) and their plotted arrays extracted (`parity/r_outputs/charts/chart_data.json.xz`). `parity/compare/compare_charts.py` rebuilds each from the Python tables (`tca.figures.aggregates`) and compares exactly; test: `pipeline/tests/test_charts.py`.

| Original chart | Underlying data | Result |
|---|---|---|
| F1 3D scatter (158 neighbourhoods) | ratio, income, robbery count, hover text | equal, same order |
| F2 boxplots by darkness and premises | (darkness, neighbourhood robbery total) pairs per premises, 16,611 values | equal as multisets |
| F3 a-d lines by season, month, day, hour | sum of robberies per premises and bin (Transit has 23 hour points, not zero-filled) | equal |
| F4 a-d total vs robbery bars | totals, robbery counts, rounded percentage labels | equal |
| F5 map | 2,779 robbery markers: positions, popup texts | equal, same order |
| Variable page: continuous-variable table | 9 variables x 6 statistics as DT strings (R's common-width padding included) | equal |
| Variable page: season, month, day, hour counts | counts per bin | equal |
| Home page stat cards | 16,611 incidents; 16.7% robbery; Moss Park highest (135); 9 variables; 24 hourly bins | equal |
| STA303 plots (DFBETAS, DFFITS, Cook, Q-Q, ROC, calibration, LASSO CV) | the arrays, compared in section 2.1 | equal within the stated tolerances |
| Explorer charts (daily, category, weekday, hour) | the fixture arrays, section 3.2 | exact |
| Model charts (tree, ROC, importance) | cptable, probabilities, importance, section 1.5 | within the tolerances there |

Row order note: the widget builder drops incomplete rows after the census merge while `Final_Project.Rmd` drops them before; the set of rows is the same, but R's merge() orders rows inside a neighbourhood differently, so `jsc370_legacy` has a flag (`na_omit_before_merge`) for each original and both are checked.

**Original captions that the data contradicts** (flagged here, kept as original until P5 corrects them, as decided): the weekend claim (Saturday is not highest in total counts; Wednesday 2,609 and Friday 2,587 exceed Saturday 2,233), the summer-rise claim (summer 564 robberies is below winter 872), and the hourly-shape claims (non-monotonic counts). See `parity/inventory/jsc370.md` for the full list.

Charts are compared as data, not as rendered pictures: the Vega-Lite re-draws are P5/P6 work, and the 3D scatter becomes a 2D scatter with colour and size (Q4 default).
