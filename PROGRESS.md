# PROGRESS

The source of truth for resuming work. Follow `RESUME.md` §2 to resume and §3 to checkpoint.

| Field | Value |
|---|---|
| Current phase | P9 prepared locally; waiting for the user's decisions before any push or deploy |
| In progress | — |
| Last sitting | 2026-10-29 (Claude Code on Kevins-iMac.local: P2 to P4 complete, tag parity-pass local) |
| Next action | Ask the user: Q1 (repository, visibility), Q3 (licence), Q6 (author line), basemap hosting, Explorer rights note; then, with explicit OK for each, push and deploy |
| Blockers | Q1 blocks P9. Outside-folder installations beyond the approved R/tectonic setup still require approval. |

## Machine log
Add a row whenever work moves to a different machine or app.

| Date | Hostname | App | Phases worked | Produced `results/`? |
|---|---|---|---|---|
| 2026-10-29 | (planning laptop) | Claude Code desktop | P0 | no |
| 2026-10-29 | Kevins-MacBook-Pro-128.local | Codex desktop | P1 complete; P2 started, no files kept | no |
| 2026-10-29 | Kevins-iMac.local | Claude Code desktop | P2 R reference re-runs (complete) | yes: `parity/r_outputs/` only (R reference, 8.7 MB of the 15 MB budget); no `results/` yet |

### Initial resume preflight (historical; resolved during P1)
- `git status` and `git log --oneline -15` both report that this folder is not a Git repository. There was no interrupted item or existing Git history to reconcile; Git initialization was still pending at that point.
- Machine prerequisites checked: R 4.3.2 (below required 4.5), Python 3.14.6 (Python 3.12 also available), Node 24.13.0, Git present. `tectonic` is not found by `type -a` or at the standard Homebrew paths; invocation failed.
- `.venv`, `.r-lib`, `.cache`, and `web/` are absent; `_reference/` exists. No downloads or installs attempted because Q5 has no default and remains unanswered.
- Preflight was included in the first P1 commit after Q5 approval and local Git initialization (`de5cbb6`).

### Machine check, Kevins-iMac.local (2026-10-29)
- Python 3.12.16 (project-local, via `make python`); `make env` and `make data` pass here (`pip check` clean, 5 data tests pass). R 4.5.3 (the MacBook had 4.6.2; P2 produced nothing there, so the reference is run here), Node 25.6.1, npm 11.9, tectonic and Git 2.50.1 present. Python 3.12 absent. `.venv`, `.cache`, `build/`, `web/node_modules` absent; `.r-lib` empty. `data/raw/` holds 5 files; `make data` not yet run here. libomp present under /opt/homebrew. Google Chrome.app present (for shinytest2/chromote).

## Decisions (answered by the user)
- 2026-10-29: User separately approved installing/upgrading R ≥4.5 and tectonic outside the project if a project-local setup is unavailable. This does not authorize other outside-folder installations (for example libomp).
- 2026-10-29: Q5 approved: R/PyPI/npm packages, Playwright Chromium and a Protomaps extract may download/install inside this project only. No approval for push, deployment or deletion; R/tectonic system installation was authorized separately.
- 2026-10-29: the JSC370 reference is `feat/eda-visual-refresh` @ 4af4309. The stale root `visual.html` is ignored.
- 2026-10-29: the JSC370 parity reference is a fresh R re-run in a pinned environment, with tier-based ranking. Published numbers are recorded alongside.
- 2026-10-29: original captions the data contradicts are kept in the port and flagged in PARITY.md, then corrected in P5 and logged in CHANGES.md.
- 2026-10-29: Explore gets exact parity on its 3 categories first, then adds auto theft and B&E.
- 2026-10-29 (P3, agent decision, reversible): the unified table drops events labelled both Robbery and another category (350 events, 708 rows), per PLAN.md P3 "choose a rule"; logged, with alternatives selectable by flag. Revisit if the user prefers keep-all.
- 2026-10-29: user accepted parity deviations D1 (JSC370 tree TP 83 vs 71), D2 (RF top-3 importance Hour vs Premises_Type) and D3 (XGBoost judged on the 10-seed mean) in chat, as written in PARITY.md section 5.
- 2026-10-29: Q2 answered by the user: do not credit the STA313 team; reimplement rather than copy.
- 2026-10-31: the user confirmed Q2 again at P9 (non-profit project; ignore the team-credit and rights note completely): closed, nothing further to do. Author line confirmed as "Kaiwen Yang". Official TPS portal host: `data.tps.ca` (current; the old `data.torontopolice.on.ca` redirects). The Skogan citation could not be verified as a 1977 journal article, so it now cites the verifiable NCJRS record (1975, NCJ 31968).
- 2026-10-29: the global seed stays 303313 (PLAN.md proposed 20240415 but 303313 was set in P3 and deviation D3 names it); PLAN.md section 3.2 updated to say so.
- 2026-10-29: compute budget for the ablation ladder, measured on a 10% sample of neighbourhoods (11,134 rows, 15 neighbourhoods; `.cache/logs/ablation_timing.json`): design A takes 2.8 s (L1), 9.7 s (L3), 32.2 s (L4), 16.9 s (L5); design B about a fifth of A. Nine variants x 14.3 (row ratio) projects about 30 minutes for A and 7 for B, so about 40 minutes of fitting plus about 30 for 1,000-replicate bootstraps; target was 3 hours. Run locally only; predictions cached as parquet in data/interim/ablation.
- 2026-10-29 (P5 review): the 18 cached ablation prediction sets were stamped with the new cache signature after checking that the model table is bit-identical (the DST fix changed 4 instants and flipped no darkness value) and that the fitting code for those rungs had not changed since they were verified current; all reported numbers were regenerated and are unchanged.

## Open questions (PLAN.md §13)
- [ ] Q1 Remote repo visibility (404 publicly) and Pages plan
- [x] Q2 answered 2026-10-29: no team credit on the site or paper; the project is presented as the user's own work. The Explore engine is a clean reimplementation of the logic (no original code, text or screenshots copied). At P9, re-check this: the Explorer repo has no licence and omitting credit does not transfer co-authors' rights.
- [ ] Q3 Licence (MIT default)
- [ ] Q4 JSC370 Fig 1: 3D scatter becomes a 2D scatter with colour and size
- [x] Q5 Project-local installs approved 2026-10-29 (R/tectonic system setup separately approved; other system installations need approval)
- [ ] Q6 Author line; STA303 term and year
- [ ] Q7 Pointer READMEs in the old repos (outside this folder)
- [x] Q8 resolved 2026-10-29: user chose a project-local route. On a machine without python3.12 run `make python` (uv in `.cache/bootstrap-venv` downloads CPython 3.12 into `.cache/python-install`, symlinked at `.cache/tools/bin/python3.12`), then `make env`. Nothing installed outside the folder; libomp was already present.

## Facts from planning (verified read-only, 2026-10-29)
- **Explorer:** local `~/Desktop/toronto-crime-explorer` equals origin/main @ dd5d689, with no unpushed work.
- **Raw data:** the Explorer's 3 CSVs are byte-identical (same MD5) to those in the Robbery repo's `data/`.
- **Coverage:** MCI data covers 2014–2023 (REPORT_YEAR). Auto theft rose from 5,793 (2020) to 12,088 (2023).
- **Toolchain:**
  - R 4.5.3 lacks shiny, testthat and shinytest2. caret 7.0.1 + xgboost 3.2.0.1 fails for `xgbTree`.
  - Python 3.14.3 has none of the analysis packages. There is no uv or conda.
  - Node 25.6.1 and npm 11.9.0 are present. tectonic 0.17 and pandoc 3.9 are present. gh and Playwright are not installed.
  - 22 GB of disk is free.

## Checklist

### P0 Plan
- [x] PLAN.md, PROGRESS.md, AGENTS.md, CLAUDE.md, CHANGES.md, RESULTS.md, RESUME.md, .gitignore
- [x] Planning notes copied to `_reference/notes/`; STA303 Rmd copied to `_reference/`

### P1 Setup and inventory
- [x] Q5 answered: user approved project-local downloads and installations, 2026-10-29
- [x] `git init` (local `main`), `.editorconfig`, first commit (`.gitignore` already exists)
- [x] Pinned references cloned and checked out detached: Robbery `4af4309b904f853fefe5ca84cce6d53d2820a588`; Explorer `dd5d689e6a9e83e09f64de0b12d77d30793c6356`; STA303 copy matches root. `_reference/` made read-only; provenance in `parity/references.json`.
- [x] `make env`: Python 3.12.2 `.venv` with exact `requirements.lock`, `.r-lib`, locked Vite React/TypeScript scaffold with ESLint/Vitest, Chromium in `.cache/playwright`; all caches redirected by `tools/env.sh`. Second locked bootstrap and `pip check` passed; scaffold lint/build passed.
- [x] `data/manifest.json` captures all 8 pinned inputs (bytes, rows, columns, MD5, SHA-256); bytes checked against Git blobs. `make data` passed initial copy and cached recheck. Five integrity tests pass, including corrupt cache/source, SHA mismatch, interrupted completion and pinned-download filename handling; Ruff passes. Raw inputs stay ignored.
- [x] `DATA_LICENSE.md`: official TPS page data and City catalogue/licence verified 2026-10-29; attribution, TPS-specific restrictions, historic snapshot limitations and unresolved Explorer coordinate rights documented. Sources/hash in `parity/licence-sources.json`.
- [x] All four P1 technical spikes passed; evidence and limitations in `parity/spikes/README.md`
  - [x] PMTiles HTTP ranges: 20,000,136-byte Toronto z14 extract verified; local preview 206/content ranges and tile decode pass (119,442 bytes requested). Existing GitHub Pages sample also returns 206. Evidence: `parity/spikes/map-ranges.json`, `parity/spikes/README.md`; no deployment performed.
  - [x] vl-convert PDF text and static Inter: title/axis/category text extractable, static Inter embedded, no variable-font table; actual PDF rendered with Poppler and visually checked. Evidence: `parity/spikes/pdf-fonts.json`, `assets.json`, `README.md`.
  - [x] tectonic/fontspec and static Source Serif 4: compiled one-page synthetic document with chart; both fonts embedded, all text searchable, Poppler render visually checked, no overfull boxes. Font-path/PDF-version warnings documented for P7.
  - [x] React Router 7 prerender and base path: locked isolated RR 7.18.5 project prerenders both routes; static artifact packaging, JavaScript-disabled H1s, hydrated navigation, nested hard refresh and asset 200s pass in Chromium. `parity/spikes/router-static.json` and README record packaging and retained-server-bundle details.
- [x] `parity/inventory/{jsc370,sta303,explorer}.md` completed by 3 independent read-only inventory agents
  - [x] STA303 source inventory: all charts and printed outputs, model formulas, preprocessing and caveats; original final summary is Gaussian. Static inspection only, not parity evidence.
  - [x] Explorer source inventory: all UI outputs, filters, counts, maps and tests; missing raw/RDS assets and incomplete coordinate provenance recorded. Static inspection only.
  - [x] JSC370 source inventory: every current widget and historical model/chart output, all stored metric tables, source/render differences and report limitations. Fresh R parity remains P2.
- [x] Tool versions recorded: R 4.6.2, Python 3.12.2 (venv), Node 24.13.0, npm 11.10.0, tectonic 0.17.0, Git 2.39.2. Python package pins: `requirements.lock`; web pins: `web/package-lock.json`; full local report: `build/tool-versions.json`. R package pins remain P2.

### P2 R reference re-runs
- [x] `parity/r/install_r_lib.R` (shiny 1.14.0, testthat 3.3.2, shinytest2 0.5.1, xgboost 1.7.8.1 compiled from the CRAN archive without extra flags) + `sessionInfo` saved to `parity/r_outputs/session_install.txt`; pins in `parity/r/r_packages.lock.csv`. xgboost smoke test passes. R 4.5.3 on this machine.
- [x] `parity/r/PATCHES.md` generated from the real diffs (`make_patches_md.sh`): Explorer none; STA303 11 hook chunks; JSC370 2 data patches + 3 hooks. No modelling line changed.
- [x] Explorer (R part): 28/28 analytical checks; both `testServer` module modes pass (source has no committed shinytest2 browser suite: a browser check is a P6 item); RDS rebuild byte-identical across two runs (md5 72d62cfd…, no original RDS exists to compare); `fixtures.json` 2,565 cases / 2.37 MB (seed 303313, 100 with full arrays and CSV); VALIDATION.md values reproduced: 566/563, 702/697, 8,455; smallest radius-boundary gap 3.2e-5 m; events (25,242) with hex-double coordinates in `events_hex.csv.gz`. Run: `bash parity/r/run_explorer.sh`, `Rscript parity/r/explorer_fixtures.R`.
- [x] STA303: knit twice with 11 export hooks; all exports and the HTML are byte-identical across the two knits; n = 174,976 (33,919 robbery); AIC keeps 6/6 terms, BIC keeps 4; AUC 0.597875; `foldid` rebuilt with `set.seed(123); sample(rep(1:10, length = n))` and matches `cv.glmnet` to 2e-16. Exports in `parity/r_outputs/sta303/` (3.8 MB, large files xz); run: `bash parity/r/run_sta303.sh`, then `collect_exports.sh`, `sta303_foldid.R`.
- [x] JSC370: full knit with xgboost 1.7.8.1 (caret default 108-combo grid) twice, identical exports; `en_CA` and `C` collation both reproduce the published split (848 test robberies of 4,984); train/test frames, predictions, matrices, hyperparameters exported to `parity/r_outputs/jsc370/`. Run: `bash parity/r/run_jsc370.sh full en_CA`, then `collect_exports.sh`.
- [x] `parity/PARITY.md`: JSC370 published vs re-run: all 30 metrics equal at 7 dp (max diff 0.0), 4 printed matrices equal. Sections for STA303, Explorer and determinism added.

### P3 Shared Python pipeline
- [x] `io`, `schema` (pandera, 4 tables), `definitions`, `features`
- [x] `explore_legacy` == R events: 25,242 rows, all 10 columns equal, R's row order reproduced, coordinates bit-equal (0 ulp), per-file manifest equal; robbery 8,455 (VALIDATION.md). `parity/compare/compare_explore.py`, `pipeline/tests/test_explore_legacy.py`
- [x] `sta303_legacy` == R model frame: 174,976 rows, all 15 columns equal, coordinates bit-equal, class counts 33,919 / 58,434 / 70,143 / 12,480; the DST gap removes 6 rows (flag `drop_dst_gap_rows`), `dow_sunday_first` reproduces the Rmd's weekday coding. `parity/compare/compare_sta303.py`, `pipeline/tests/test_sta303_legacy.py`
- [x] `jsc370_legacy` == R `final_data`: 16,611 rows, 2,779 robberies, 158/158 neighbourhoods, census features bit-identical (0 relative difference); full-row multiset equal AND R's row order reproduced exactly (R's merge() Shell-sort tie order ported, `r_left_merge_order`). `parity/compare/compare_jsc370.py`, `pipeline/tests/test_jsc370_legacy.py`
- [x] `unified` table: 159,072 rows (Robbery 25,661; B&E 69,111; Auto Theft 52,227; Theft Over 12,073), 2014-2023, step-by-step ledger in `parity/reports/unified_ledger.json`. Cross-category: 1,580 event IDs appear in more than one category file; 350 have a Robbery row and another category. Rule (default `drop_label_conflicts`): drop all rows of those 350 so no incident is both positive and negative; the other 1,230 (negative categories only) stay. `keep_all` and `drop_all_multi` exist as named options. After exact dedup `event_id` is unique within a category.
- [x] pytest green (24 tests, ruff clean); code review (/code-review high, 9 findings): fixed R-collation fallback and global setlocale, unique-key check in the merge-order port, spelling-fix test, missing-neighbourhood handling, empty-file manifest, duplicate subset label, dead code; skipped the shared legacy-wrangling refactor and rebuild caching as low-value. All three parity comparisons PASS.

### P4 Faithful ports
- [x] 4a Explain port (numeric outputs), `pipeline/src/tca/explain/{sta303_port,lasso}.py`, report `parity/reports/sta303_port.json`, tests `pipeline/tests/test_sta303_port.py`. Observed vs R: full-model coefficients/SE/z 7e-14, deviance/AIC/BIC 1e-15, GVIF 3e-15, AIC 6/6 and BIC 4 terms equal, LRT chi2 2e-10, DFBETAS max 5e-10 and DFFITS/Cook 6e-8 (float32 export), all top-20 index lists equal, ROC and AUC 1e-12 (label 0.60 equal), lrm stats 1e-12, Gaussian table 1e-12, apparent calibration 7e-12, bias-corrected curve 0.0105 (tolerance 0.02), printed calibration stats 1.6e-4 (tolerance 1e-3), LASSO: same 44-value path, lambda.min equal, coefficients 2.4e-5, linear predictor 2.6e-5, Covid contrast 2.5e-6, zero pattern equal, cvm 3.7e-5. Chart aggregates (Vega-Lite specs) deferred to the figure phase. Deviations: own R-faithful IRLS instead of statsmodels GLM (R's epsilon-1e-8 stop and last-iteration weights drive SE/influence); own proximal-Newton coordinate descent for glmnet; glmnet early-stop rule matched empirically (absolute 1e-5 gain).
- [~] 4b Predict port (point metrics), `pipeline/src/tca/predict/jsc370_port.py`, report `parity/reports/jsc370_port.json`, tests `pipeline/tests/test_jsc370_port.py`. GLM: confusion matrix identical, coefficients 1e-11, aliased term the same. GBM: matrix identical. Bagging TP 408/407 FP 187/190, RF TP 383/380 FP 111/112 (within tolerance). XGBoost: judged on the mean of 10 pre-declared seeds (SEED..SEED+9): TP 215 vs 199, FP 123 vs 133, F1 .363 vs .337 (within); the single SEED fit (TP 232) is outside, seed luck. DEVIATIONS needing the user's acceptance: (1) tree test TP 83 vs R 71 (tolerance 10; FP and F1 within), 12 leaves vs 8, pruned at R's cp on a scikit-learn tree with response-rate-ordered factors; other encodings tried (alphabetical codes: TP 76 FP 38; 8-leaf best-first; one-hot) all differ somewhere; (2) RF top-3 importance has Hour where R has Premises_Type (0.115 vs 0.113, near tie); bagging top-3 equal; with response-rate factor ordering RF's top 3 match but RF FP is 135 (R 112). Tier rule (paired bootstrap, 1,000 reps, shared indices): identical partition for R and Python, {RF, Bagging} > {XGBoost} > {Tree} > {GBM, GLM}. Python-tuned row done (PARITY.md 1.6): CV picks R's XGBoost setting exactly; GBM at depth 3 reaches F1 .208 vs .065. Chart data: see the chart checklist item.
- [x] 4c Explore engine (TS) + legacy bundle: `web/src/explore-engine/{analysis,bundle}.ts`, vitest `web/tests/explore-engine.test.ts` (10 tests; lint and tsc clean). All 2,565 R fixture cases exact (records, record order, distinct IDs, 3 bar vectors, daily/day/week/month arrays by sha256, CSV bytes), on both the table built from R's CSV export and the shipped binary `web/public/data/explore/legacy.bin` (681,534 B raw, 316,147 B gzip, budget 600 KB; coordinates bit-equal). Published validation counts reproduced (566/563, 702, 8,455). A deliberate bug in the peak hours made 2 tests fail, so the suite does detect regressions. Exporter `pipeline/src/tca/explore/export.py` (`PYTHONPATH=pipeline/src python -m tca.explore.export`), tests `pipeline/tests/test_explore_export.py`. Not yet: Explore v2 bundle (auto theft and B&E) belongs to P6.
- [x] 4d Design tokens + Vega theme + palette validation: `design/tokens.json`, generated `web/src/styles/tokens.css`, `design/vega-theme.json`, `paper/generated/colors.tex` (`python tools/gen_tokens.py [--check]`), `tools/check_palette.py` (port of the dataviz validator, tested against it) -> `design/palette-validation.md`. All pairs compared: no FAIL in either mode, dark has no warnings, light has one CVD floor-band warning (B&E vs Theft over, 7.6) covered by markers/labels. Bicycle theft is now deep magenta (ochre failed 1.8 vs Robbery); logged as restyle D4 in PARITY.md. `design/search_slot.py` documents the candidate search. DESIGN.md prose still to write in P6.
- [x] Chart checklist: 81 of 81 checks equal (`parity/compare/compare_charts.py`, `pipeline/tests/test_charts.py`, report `parity/reports/charts.json`). The refreshed widgets and variable.Rmd ran unmodified in R (`parity/r/run_charts.sh`, identical across two runs); data in `parity/r_outputs/charts/`. Contradicted captions flagged in PARITY.md section 7. New flag `jsc370_legacy(na_omit_before_merge=...)` because the widget builder and Final_Project.Rmd order merged rows differently.
- [x] PARITY.md: every comparison is within tolerance or an accepted deviation (D1-D3 accepted by the user 2026-10-29; D4 logged restyle). P4 code review (/code-review high, 10 findings) all fixed: CSV quote doubling, NaN hour guard, project SEED for the calibration folds (corrected curve now 0.0105 from R, tolerance 0.02), full-length coordinate check, one XGBoost constructor, pure-root guard, dead code removed, runtime bundle checksum, in-repo palette search (reproduces the same 17 candidates), seed-range figure corrected. Local tag `parity-pass` created (not pushed).

### P5 Improvements
- [x] STA303 v2 (items 1-9 in PLAN.md 5.1 plus weekday as a factor): `pipeline/src/tca/explain/sta303_v2.py`, solar darkness in `features.py` (astronomy tests), results `results/explain/explain.sta303_v2.json` (identical identity hash across two runs), CHANGES.md rows S1-S10, RESULTS.md generated. Headline: 159,056 rows; post-2019 OR 0.55 (0.53-0.56; cluster-robust 0.52-0.58); composition: auto theft 0.34, break and enter 0.81, theft over 0.61; CV AUC 0.631 (sd 0.003); harmonic model worse (AIC +517). Cluster covariance checked against statsmodels. Infrastructure: `tca/results.py`, `tools/hash_outputs.py`, `tools/gen_results_md.py`.
- [x] Compute-budget measurement on a 10% sample (projection recorded under Decisions; actual full fit about 1 h 10 min, bootstrap 3 min)
- [x] Ablation ladder L0-L5 + no-premises, grouped CV + temporal holdout, 1,000-replicate neighbourhood-cluster bootstrap with paired differences: `pipeline/src/tca/predict/{ablation,ablation_run,bootstrap,ablation_report}.py`, results `predict.ablation`. Grouped CV ROC-AUC (95% CI): L1 time only 0.588 (0.579-0.597); L2 +location/premises 0.836; L3 +census 0.839; L4 forest 0.858; L5 XGBoost 0.860 (0.851-0.869); L2 without premises/location 0.599. Temporal holdout: L5 0.841. Leakage guards (9 fast + 3 slow determinism tests) in `pipeline/tests/test_ablation_guards.py`. Found and fixed: forest predictions were thread-order dependent (now single-thread predict), L4 caches regenerated, numbers unchanged.
- [x] XGBoost grid fix (as-intended grid: depth 7, 200 rounds, 10-seed mean test F1 0.577 vs 0.363 as run; `predict.xgb_grid_fix`), seeds everywhere, caption corrections (`predict.eda_corrections`: summer, weekend, darkness, hourly all contradicted; Figure 2 at neighbourhood level)
- [x] Inference vs prediction comparison (`predict.inference_vs_prediction`): 28 of 41 time terms statistically clear, yet time alone has ROC-AUC 0.588
- [x] CHANGES.md (S1-S10, A1-A6, X1-X2, E1-E5, I1) and RESULTS.md (generated, 5 keys) complete; identity hashes identical across two runs (STA303 v2 twice, ablation report twice, model refits deterministic).

### P6 Website
- [x] Shell, design-system components, theme toggle (React Router 7 framework mode, ssr false, all 7 routes prerendered; commit 1c96ebf)
- [x] Pages built: Explain, Predict, Overview, Methods, About, Explore (engine, MapLibre + PMTiles basemap, URL state, filters, charts); Paper is a placeholder until P7
- [x] Numbers only through `<Num k>` from per-page results JSON (`tools/gen_web_data.py`, `design/display_formats.json`); missing value or format fails the build; `scripts/check-content-numerals.mjs` lint
- [x] Budgets (`tools/check_bundle_size.mjs`, all pass; maplibre-gl pinned to 4.7.1 because 5.x was 270 KB gz against a 260 KB budget); Playwright smoke + axe on 7 routes x 3 widths x 2 schemes (zero serious/critical, no overflow, no console errors); Lighthouse mobile performance 90 to 100, accessibility 100 (gzip-serving local preview)
- [x] Explore v2 categories: `v2.bin` (56,457 records, 728 KB gz, event classes shared with legacy; Python test and vitest merge test; legacy bytes unchanged; loads only when switched on; script `web/scripts/v2-check.mjs`)
- [x] Self design review with Playwright screenshots (375 / 768 / 1280, light and dark; fixes: filled line marks, mobile header, long H1s, overflow); P6 code review (8 findings: 5 fixed, 2 skipped awaiting approval, 1 documented); `design/DESIGN.md` written. A separate read-only design-review agent pass is still to do in P8
- [ ] Not yet on the site: JSC370 Key Variable Statistics table, census scatter (Fig 1, Q4), LASSO / VIF / ROC / influence panels of the STA303 model checks (not exported to `results/`), Paper PDF (P7)
- Decisions: Explore counts are computed in the browser from the checksummed bundle (not results JSON; stated on Methods). The basemap is committed since P9 (20 MB, sha256 pinned; `tools/fetch_basemap.sh` documents the extraction). Vega-Lite 6 / vega-embed 7 are used (PLAN said 5). Scaffold files `web/src/{App.tsx,main.tsx,App.css,index.css,assets/}` are unused and await approval to delete.

### P7 Paper
- [x] `\res{}` macros (`\resG/A/B/I` shorthands) generated from results by `tools/gen_paper.py` into `paper/generated/numbers.tex`; tables `tab_flow.tex`, `tab_metrics.tex`; four figures from `web/src/lib/paperSpecs.ts` (reusing the site's row builders and theme) rendered by vl-convert; Python formatter parity-tested against the site's `formatNumber` (`tools/tests/test_gen_paper.py`)
- [x] `make paper`: numerals lint (`tools/check_paper_numerals.py`), tectonic, `tools/check_paper_pdf.py` (6 pages, all fonts embedded, figure text extractable), copy to `web/public/paper/paper.pdf` (163 KB); Paper page now links it
- [x] Added `category_by_year` to `explain.sta303_v2` (Fig 1); other values unchanged; regenerated on a clean tree, RESULTS/CHECKSUMS refreshed
- Decisions: Tab 2 (original vs corrected) was cut as the plan allows, since the original's numbers live in `parity/r_outputs`, not `results/`; the corrections are described in words in Methods 3.4. Fonts: Source Serif 4 It/Semibold/Bold and Inter Medium/SemiBold were fetched into `.cache/fonts` (Adobe pinned commit; Inter from the cached 4.1 zip) and are not yet in `parity/spikes/assets.json`. Tectonic prints "PDF 1.7 newer than 1.5" warnings for the figure PDFs; harmless, the setting could not be raised. Fixed the site's data-licence wording (TPS data is OGL Ontario, census profiles OGL Toronto) in About, Methods and the footer.
- To do before release: the bibliography was written from memory and must be verified entry by entry (P8); the author line is the default "Kaiwen Yang" (Q6); the availability paragraph has a visible `[link added at release]` placeholder (Q1)

### P8 Review loop
- [x] `tools/audit_numbers.py` (string-matches every numeral on the built site and in the paper PDF against stored results in their display formats; 0 unmatched; tests in `tools/tests/test_audit_numbers.py`) plus a manual honesty-audit agent pass: `reviews/honesty-audit.md` (4 blockers, 14 should-fixes, 15 nits). Fixed: wrong CV design wording, false weekday title, wrong XGBoost-grid statement, tolerance overclaim, "place" vs premises wording and H1s, dropped intervals, reference-hour caveat, paper title (now "Which crime type is it? ...", because "When and where" contradicted the no-forecast limit), P/R intervals in Table 2. Not fixed: nits 22, 25 (shown as -0.000, honest), 29 partly, 33; item 18 (sample-flow gap of 15,589 unitemized rows; needs the intermediate counts logged as results keys) and the Explore claim about counts are open
- [x] Design review pass 2: `reviews/design-review.md` (0 blockers, 9 should-fixes, 11 nits). Fixed: ladder labels at 375, PR-curve dashes and ticks, Explore crime-type bars and weekday labels, table scroll shadows, Overview card order, Methods nav pin. Open: Explore map below the fold at 375/768 (needs layout rework), Overview fold shows no chart supporting the H1, touch targets under 44 px, prose measure 85+ characters, the paper placeholder `[link added at release]`, author name (Q6)
- [x] Code review (high) of `5873867..HEAD`: 9 findings, 8 fixed, 1 skipped (review scratch files committed by `git add -A`; history rewrite needs approval). Security review done by hand (`reviews/security-review.md`; the skill needs an origin remote): 2 low fixes. Simplify done inline (Fig 4 panel helper, audit tag set)
- [x] Fresh checkout in `build/fresh/` (`bash tools/fresh_checkout.sh`; R re-runs skipped, committed `parity/r_outputs` used): env, data, parity, analysis from scratch (51 min), web, paper, audit all pass; result hashes IDENTICAL to the committed ones at 389f5d9 (first run differed only in wall-clock `fit_seconds`, now excluded from identity hashes). Final run reused the fresh clone's cached ablation predictions. Audit item 18 fixed: the sample-flow table now adds up (new `log.rows_outside_toronto_box`, `exact_duplicate_rows_dropped`, `cross_category_conflict_rows_dropped`)
- Bibliography: `skogan1977dark` could not be confirmed (an NCJRS abstract dated 1975 was found); other ten entries recognised. Portal URL: `data.tps.ca` answers, a search suggests `data.torontopolice.on.ca`; confirm before release

### P9 Release (ask before each step)
- [x] README (with four screenshots in `docs/screenshots/`), `LICENSE` (MIT with "Kaiwen Yang" as holder: the plan's defaults for Q3 and Q6, not yet confirmed by the user), `DATA_LICENSE.md` (existing)
- [x] `.github/workflows/ci.yml` and `pages.yml` written locally; never run, third-party action `wtfjoke/setup-tectonic@v3` unverified; `pages.yml` is `workflow_dispatch` only
- [ ] Ask → git push (blocked on Q1: repository name and visibility; free Pages needs a public repo)
- [ ] Ask → enable and deploy GitHub Pages (the user sets Settings > Pages > Source to "GitHub Actions", then runs `pages` manually)
- [x] Suggested old-repo pointer READMEs listed in `docs/old-repo-pointers.md` (not done), with the Q2 rights note for the Explorer
- Before the first push also: replace `[link added at release]` in `paper/sections/availability.tex`, check `skogan1977dark` and the portal URL, confirm the author line, decide on the scaffold-file deletion and the committed review scratch files (`reviews/shots*`)

## Sitting log
| Date | Phase | Done | Next |
|---|---|---|---|
| 2026-10-29 | P0 | Inventoried all 3 originals (read-only); 4 decisions answered; plan stress-tested and revised; plan files written | Q5, then P1 |
| 2026-10-29 | Resume preflight | Read rules and resume state; checked Git, hostname and prerequisites; recorded fresh-machine blockers | Q5 approval and R/tectonic prerequisite decision, then P1 |
| 2026-10-29 | P1 | Q5 and R/tectonic approvals recorded; local Git/checkpoints; pinned read-only references; locked env and Chromium; verified raw inputs; publisher licences; 3 inventories; 4 spikes passed | P2 pinned R dependencies and cached reference reruns |
| 2026-10-29 | P2 | Pinned R library (shiny 1.14.0, xgboost 1.7.8.1); Explorer 28/28, RDS byte-identical, 2,565 fixtures; STA303 n = 174,976, identical double knit, foldid verified; JSC370 reproduces the published table exactly, identical double knit; PATCHES.md, PARITY.md | Q8, then P3 |
| 2026-10-29 | P3 | io/schema/definitions/features; explore_legacy, sta303_legacy, jsc370_legacy exact vs R (bit-equal coordinates, R row order reproduced); unified table with ledger and cross-category rule; 24 tests; code review fixed | P4 |
| 2026-10-29 | P4 | 4a Explain port (all numeric outputs vs R), 4b Predict port (5 of 6 models within tolerance or documented, tier partition identical), 4d tokens + palette validation; PARITY.md sections 1.5, 2.1, 3.1, 5-7 | user decisions on D1-D3 and Q2, then chart aggregates and 4c |
| 2026-10-29 | P4 (close) | chart checklist 81/81 from unmodified R widgets, Python-tuned row, TypeScript Explore engine + bundle, code review fixed, `parity-pass` tagged locally | P5 |
| 2026-10-29 | P5 | STA303 v2; ablation ladder (18 variants, 1,000-replicate cluster bootstrap); XGBoost grid fix; caption evidence; inference vs prediction; CHANGES/RESULTS; determinism checks; code review (9 findings fixed: cache signature, verdict logic, dirty flag, DST reading, message criteria, bootstrap memory) | P6 |

## P1 verification notes

- P1 checkpoint: Q5 recorded, local `main` initialized, `.editorconfig` added; initial commit includes the existing planning files and the resume preflight. No remote configured.

- P1 environment acceptance: `make env` completed twice, `pip check` reports no broken requirements, analysis imports pass, `npm run lint` and `npm run build` pass, Playwright Chromium downloaded. TypeScript 6.0 selected for typescript-eslint compatibility; no analysis or parity result generated. System installation: R/tectonic and their required dependencies; Homebrew cleanup disabled.

