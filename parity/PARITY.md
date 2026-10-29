# PARITY

Evidence that each Python/TypeScript port matches the original R project (AGENTS.md rule 1). Tolerances are in PLAN.md §5 (P3, P4).
This file is built up phase by phase. **P2 (this version) records the R reference only.** No Python port exists yet, so no port-vs-R column is filled in.

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

## 4. Determinism checks

| Run | Result |
|---|---|
| STA303, two knits | all 55 exported files and the HTML are byte-identical |
| Explorer RDS, two builds | byte-identical |
| JSC370, two full knits (including the xgboost grid) | all 23 exported files identical (MD5 of uncompressed content) |

## 5. Deviations and open flags
- None accepted yet. Original captions the data contradicts are listed in `parity/inventory/*.md` and will be flagged here when the charts are ported (P4d).
