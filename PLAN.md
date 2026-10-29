# Toronto Crime Analytics: PLAN

> Approved 2026-10-29. Any executor (Claude Code or Codex) can run this plan; tool-specific notes appear only in §11. Progress is tracked in `PROGRESS.md`.

## 0. Context

Three Toronto crime course projects use the same Toronto Police Service (TPS) open data. Each is a mid-strength R project with its own weakness:

| Project | Question | Weakness alone |
|---|---|---|
| JSC370 Robbery Classification (R, 6 models, R Markdown site) | Which major crime type is a 2020 incident? | One random split, no AUC, neighbourhood leakage, XGBoost tuning grid never used |
| STA303 Robbery Inference (R Markdown, GLM) | Which time factors shift the odds of robbery? | The "final" table is a Gaussian LM; hour and month are entered as linear terms; "COVID" naming |
| STA313 Toronto Crime Explorer (R Shiny) | What has been reported near a place, and when? | Not deployed; descriptive only |

This project combines them into one portfolio product:
- one validated Python pipeline with one definition: **robbery vs other major property crime**;
- a static React + TypeScript site on GitHub Pages;
- a research paper of at most 7 pages.

Each original is ported **faithfully first** and checked for parity against R re-runs. Improvements come only after that.

### Facts established during planning (read-only checks, 2026-10-29)
- **Robbery repo.** Local `~/Desktop/Projects/Robbery_Crime_Classification` is on `feat/eda-visual-refresh` @ `4af4309`, which is pushed and matches origin. `origin/main` (`20bb8d0`) lacks its 5 newest commits. The untracked root `visual.html` and `visual_files/` are a stale render and can be ignored. **Decision: use `feat/eda-visual-refresh`.**
- **Explorer repo.** Local `~/Desktop/toronto-crime-explorer` equals `origin/main` @ `dd5d689`, with no unpushed work. Use the clone.
- **Raw data.** The 7 TPS CSVs and `Income_Dataset.xlsx` live in the Robbery repo's `data/` (73 MB, committed there). The Explorer's 3 inputs are byte-identical (same MD5) to the copies there: bicycle `6c4aa1de…`, robbery `ee4b4dd2…`, theft over `0184455f…`. **One raw input set serves all three projects.**
- **Real coverage is 2014–2023.** REPORT_YEAR starts in 2014. OCC_YEAR values before 2014 (2000–2013, a few hundred rows) are late-reported incidents.
- **The negative class changes over time.** Auto theft rose from 5,793 (2020) to 12,088 (2023), while robbery fell from 3,757 (2014) to 3,145 (2023). Robbery share therefore drops partly because the denominator grows. Both the paper and the Explain page must state this composition effect.
- **JSC370 published metrics don't reproduce, even in R.** caret 7.0.1 `xgbTree` fails with the installed xgboost 3.2. Today's split selects different rows (likely locale collation in `merge()`), so the test set has 853 robberies vs 848 published. In that re-run Bagging edges out RF on F1. R's `randomForest` treats the character columns `Premises_Type` and `Season` as integer codes. **Decision: the parity reference is a fresh R re-run in a pinned environment. Ranking parity uses performance tiers. Published numbers are recorded alongside.**
- **Some original JSC370 captions are contradicted by the data.** "Summer increase": robbery peaks Jan–Mar. "Darkness raises robbery": dark-hours share is 16.4% vs 17.2% in daylight. "Weekends higher": Saturday is highest but Sunday is among the lowest. Fig 2 repeats each neighbourhood's total on every incident row. **Decision: the port keeps the chart and its text and flags the mismatch in PARITY.md. The improvement phase rewrites the caption from data and logs it in CHANGES.md.**
- **STA303 details.**
  - `Covid_Outbreak` = OCC_YEAR ≥ 2020, a factor. Darkness = hour ≥ 18 or < 6.
  - Season is a function of month, so it is aliased with a month factor. Fixed-cutoff Darkness is a function of hour, so it is aliased with an hour factor. The improved model must handle both (§5.2).
  - 6 rows fall in the DST spring-forward gap and are dropped by `as.POSIXct` (TZ- and locale-dependent).
  - `calibrate()` runs without a seed.
- **Explorer exactness.** A record lies within 0.0099 m of a radius boundary (Queen Stn, 300 m), and others within 3.2e-5 m. The port must keep full float64 coordinates and use the same haversine (R = 6,371,008.8 m, clamp before asin, `<=`). Dedup must use all 10 fields including `status`. Dates must be handled as integer days or UTC. **Decision: exact parity on 3 categories, then add auto theft and B&E.**
- **Toolchain.**
  - R 4.5.3 has every needed package except shiny, testthat and shinytest2.
  - Python 3.14.3 has no pandas, sklearn, statsmodels or xgboost. There is no uv or conda.
  - Node 25.6 and npm 11.9 are present; pnpm and Playwright are not.
  - tectonic 0.17 and pandoc 3.9 are present. gh is not installed.
  - 22 GB of disk is free.
- **Remote.** `KaiwenYangUT/toronto-crime-analytics` returns 404 without authentication, so it is private or not yet created (see Q1).

## 1. Final folder structure

```
toronto-crime-analytics/
├── AGENTS.md            # canonical rules for any agent (Codex reads this)
├── CLAUDE.md            # "@AGENTS.md" + Claude-Code-specific notes
├── PLAN.md  PROGRESS.md  CHANGES.md  RESULTS.md  README.md
├── LICENSE              # MIT for code (pending Q3)
├── DATA_LICENSE.md      # TPS + City of Toronto terms, verified in P1
├── Makefile             # single entrypoint: env, data, rref, parity, analysis, web, paper, audit, all
├── .gitignore  .editorconfig  .python-version  .nvmrc
├── _reference/          # GITIGNORED, READ-ONLY (chmod -R a-w after cloning)
│   ├── Robbery_Crime_Classification/   # clone @ feat/eda-visual-refresh 4af4309
│   ├── toronto-crime-explorer/         # clone @ dd5d689
│   └── STA303_Final_Report.Rmd         # copy of ./STA303_Final_Report.Rmd
├── data/
│   ├── manifest.json    # COMMITTED: per file source URL (pinned commit SHA), bytes, rows, md5, sha256
│   ├── raw/             # gitignored, filled by `make data` (copied from _reference or downloaded), verified
│   └── interim/         # gitignored parquet tables
├── pipeline/            # Python package `tca`
│   ├── pyproject.toml   requirements.lock
│   ├── src/tca/
│   │   ├── io.py            fetch + checksum verify, CSV read (UTF-8 BOM), census xlsx (duplicate names)
│   │   ├── schema.py        pandera schemas for every table
│   │   ├── definitions.py   THE task definition, windows, category maps (documented constants)
│   │   ├── features.py      time, season, fixed darkness, solar darkness (v2), census-engineered
│   │   ├── build.py         tables: unified, sta303_legacy, jsc370_legacy, explore_legacy, explore_v2
│   │   ├── explain/         sta303_port.py, sta303_v2.py, diagnostics.py
│   │   ├── predict/         jsc370_port.py, ablation.py, evaluate.py, bootstrap.py, tuning.py
│   │   ├── explore/         export.py (binary bundle + meta), fixtures.py
│   │   ├── figures/         theme.py (Vega config from design/tokens.json), specs/*.py, render.py
│   │   └── results.py       write_result(): JSON + provenance header (script, git SHA, input sha256, seed)
│   └── tests/           pytest: schemas, definitions, features, metric code, no-leakage checks
├── parity/
│   ├── PARITY.md        the parity ledger (pass/fail per item, tolerance, observed delta)
│   ├── inventory/       jsc370.md, sta303.md, explorer.md (from P1 inventory agents)
│   ├── r/               install_r_lib.R, run_all.sh, sta303_rerun.R, jsc370_rerun.R,
│   │                    explorer_rerun.R, explorer_fixtures.R, PATCHES.md
│   ├── r_outputs/       COMMITTED small JSON/CSV from R re-runs (incl. split indices, predictions)
│   ├── compare/         compare_explore.py, compare_sta303.py, compare_jsc370.py, compare_charts.py
│   └── reports/         COMMITTED generated comparison tables (markdown)
├── results/             COMMITTED: the only source of numbers for site + paper
│   ├── data/  explain/  predict/  explore/   (JSON/CSV, each with provenance header)
│   └── index.json       machine-readable registry (RESULTS.md is generated from it + prose)
├── design/
│   ├── tokens.json      single source: colour, type, spacing → CSS vars, Vega config, LaTeX \definecolor
│   └── DESIGN.md        the spec in §6, rendered as the living style guide
├── web/                 Vite + React + TypeScript
│   ├── src/
│   │   ├── app/         router, layout shell, theme provider
│   │   ├── pages/       Overview, Explore, Explain, Predict, Paper, Methods, About
│   │   ├── components/  design-system components (§6.4)
│   │   ├── charts/      VegaChart wrapper + one spec builder per chart
│   │   ├── map/         MapLibre wrapper, layers
│   │   ├── explore-engine/  pure TS port of R/analysis.R (filter, period, haversine, trends)
│   │   ├── content/     page copy (MDX); numbers only via <Num k="explain.or_post2019"/>
│   │   └── styles/      tokens.css (generated), global.css
│   ├── public/data/     generated copy of results subset + explore bundle (committed)
│   ├── public/paper/    paper.pdf (copied by `make paper`)
│   ├── tests/           vitest: engine unit tests + parity fixtures (exact)
│   └── e2e/             Playwright: smoke, a11y (axe), screenshots for design review
├── paper/
│   ├── main.tex  sections/*.tex  refs.bib  fonts/ (OFL)
│   ├── generated/       numbers.tex (\newcommand macros), tables/*.tex, figures/*.pdf (from Vega-Lite)
│   └── build/           gitignored; paper.pdf
├── reviews/             honesty-audit-NN.md, design-review-NN/ (screenshots + critique)
├── tools/               audit_numbers.py, check_page_count.py, check_bundle_size.mjs, gen_tokens.py
├── .cache/              gitignored: pip, npm, Playwright browsers, tectonic, R downloads (§3.4)
└── .github/workflows/   ci.yml (tests, parity, drift check, build); pages.yml (deploy, only after approval)
```

### 1.1 Where each original file goes

| Original | Logic → | Charts and content → |
|---|---|---|
| **JSC370** `Final_Project.Rmd` L37–295 (load, clean, census, 7 name fixes, merge) | `tca/build.py::jsc370_legacy`, `features.py` | Methods › Data |
| `Final_Project.Rmd` L392–891 (split, 6 models, metrics) | `predict/jsc370_port.py` | Predict › "Original benchmark" table |
| `Final_Project.Rmd` L303–367 (summary table, 4 count bars) | `results/data/variable_stats.json` | Methods › Variables (table + 4-panel counts) |
| `Final_Project.Rmd` L456 ROC, L476–491 trees, L555/618/649 importance | port | Predict › Original benchmark (ROC; RF importance restyled; trees as a static figure in a disclosure) |
| `index.Rmd` (Description: background, RQ, variables, sources, insight cards, references) | — | Overview (question, cards) + Methods (background, variables, sources, references) |
| `variable.Rmd` (Key Variable Statistics) | — | Methods › Variables |
| `visual.Rmd` + `scripts/build_visual_widgets.R` Fig 1 (3D scatter: census) | aggregates in `results/predict/census_scatter.json` | Predict › Census features. **2D scatter with colour + size** (Q4: z duplicated colour) |
| Fig 2 (box: darkness × premises) | `results/explain/darkness_box.json` | Explain › Patterns |
| Fig 3 ×4 (lines: robbery count by premises over season/month/day/hour) | `results/explain/premises_time.json` | Explain › Patterns (one chart, segmented control season/month/day/hour) |
| Fig 4 ×4 (overlaid bars: total vs robbery, % hover) | `results/explain/total_vs_robbery.json` | Explain › Patterns (same segmented control) |
| Fig 5 (Leaflet: 2020 robberies by premises) | Explore preset `?preset=jsc370-fig5` | Explore (MapLibre, colour by premises) + linked from Predict |
| `model.Rmd` (Model page: table, importance) | — | Predict |
| `acknowledgements.Rmd` | — | About › Acknowledgements (verbatim, restyled) |
| `report.Rmd` + `docs/JSC370 Final Project Report Kaiwen Yang.pdf` | — | Paper › "Original course reports" (link to the file in the Robbery repo at pinned SHA) |
| `scripts/prepare_project_data.R` | cross-check in `parity/compare` (same 16,611 rows) | — |
| `docs/assets/JSC370_Video_Presentation.mp4` | — | About: link only (not copied, 18 MB) |
| **STA303** `STA303_Final_Report.Rmd` L15–102 (load, derive) | `build.py::sta303_legacy` | Methods › Data |
| L113–207 (full GLM, VIF, AIC/BIC step, LASSO, LRT) | `explain/sta303_port.py` | Explain › Model checks (selection table, VIF table, LASSO path) |
| L212–337 (DFBETAS, DFFITS, Cook's, Q-Q, calibration, ROC) | `explain/diagnostics.py` | Explain › Model checks (each restyled; large-n panels pre-rendered as SVG/PNG by the same Vega specs) |
| L342–365 "Summary of Final Logistic Regression Model" (actually Gaussian) | ported as-is for parity, then replaced (CHANGES) | Explain › "Original vs corrected model" table |
| **Explorer** `scripts/build_data.R` | `build.py::explore_legacy` (must equal `crime.rds` row for row) | Methods › Explorer data |
| `R/analysis.R` (haversine, nearest_station, period_mask, filter_events, daily_counts, trend_counts, validate_bundle) | `web/src/explore-engine/*.ts` (+ Python twin in `tca/explore` for fixtures) | Explore |
| `R/explorer.R` + `app.R` (sidebar, map, trend, 3 bar charts, totals, CSV export, caveats) | React components | Explore (filter panel, map, trends, bars, totals, export, inline caveats) |
| Explorer Introduction tab | — | Explore intro strip + Overview "How to use Explore" |
| Explorer "About the data" tab | — | Explore inline caveats + Methods › Explorer data |
| `config/places.csv`, `config/stations.csv` | copied to `pipeline/config/` with provenance note | Explore destination/station lists |
| `tests/test_analysis.R`, `tests/test_shiny.R`, VALIDATION.md | become vitest + parity fixtures | — |

## 2. The shared definition (`tca/definitions.py`, also in Methods and paper §2)

- **Unit:** one TPS Major Crime Indicator (MCI) incident record.
- **Positive:** `MCI_CATEGORY == "Robbery"`.
- **Negative ("other major property crime"):** `MCI_CATEGORY ∈ {Auto Theft, Break and Enter, Theft Over}`.
- **Excluded, with reasons:**
  - Assault: an MCI, but not a property crime and not in the inputs.
  - Bicycle theft, homicide, shootings: not in the MCI files. Previously they were dropped silently through NA. Now they are dropped by explicit rule.
- **Window:** OCC_YEAR 2014–2023 (reporting starts in 2014). Legacy builders keep their original windows (JSC370: 2020; STA303: 2000–2023; Explorer: ≥ 2020-01-01).
- **Validity:**
  - hour in 0–23;
  - valid calendar date, round-trip checked;
  - premises present;
  - coordinates inside the Toronto box (−80 < lon < −78, 43 < lat < 45);
  - neighbourhood ≠ NSA (for census-joined tables).
- **Dedup:** exact duplicates on the retained fields, within a category.
- **Task framing (used verbatim everywhere):** *"Given that a major property-type crime was reported, which type is it?"* This is P(robbery | reported MCI incident). It is not robbery risk at a place or time, which would need exposure data.

## 3. Data handling

### 3.1 Committed vs fetched
| Item | Size | Policy |
|---|---|---|
| 7 TPS CSVs + `Income_Dataset.xlsx` | 73 MB | **Not committed.** `make data` copies from `_reference/Robbery_Crime_Classification/data/`, or downloads from `raw.githubusercontent.com/KaiwenYangUT/Robbery_Crime_Classification/4af4309/data/...` (immutable SHA). Then it verifies sha256 and md5 against `data/manifest.json` and fails loudly on mismatch. |
| `data/manifest.json` | < 5 KB | Committed. Holds original source URLs (TPS portal, City of Toronto Neighbourhood Profiles), retrieval provenance, bytes, rows, checksums. |
| `data/interim/*.parquet` | ~20 MB | Gitignored. Rebuilt deterministically. |
| `parity/r_outputs/`, `parity/reports/` | < 15 MB | Committed. Evidence for PARITY.md. Includes the JSC370 train/test frames (~3 MB), predictions, and Explore fixtures (< 3 MB, hashed arrays). STA303 influence vectors go in compressed parquet (~5 MB). |
| `results/` | < 10 MB | Committed. Every published number lives here. |
| `web/public/data/` | see 3.3 | Committed (built from `results/`). CI rebuilds it and diffs: the drift check. |
| `paper/generated/` | < 3 MB | Committed. |

### 3.2 Checksums and determinism
- Inputs: verified on every `make` target via `tca.io.verify()`.
- Outputs: every results file records a header `{producer, git_sha, inputs:{file: sha256}, seed, created}`. `tools/hash_outputs.py` writes `results/CHECKSUMS.sha256`.
- Two clean runs **on the same machine** must produce byte-identical results JSON. Floats are written with `repr`; timestamps are excluded from the hash.
- Across machines (macOS arm64 locally vs Ubuntu in CI), only integer and data outputs must match exactly: tables, explore bundle, fixtures. Model outputs are checked against the parity tolerances. CI never retrains P5 models; it validates the committed results (schema, provenance, hashes, and parity compare against the committed `r_outputs`).
- Seeds: global `SEED = 20240415` in `definitions.py`, passed explicitly to every RNG (numpy Generator, sklearn `random_state`, xgboost `seed`). `n_jobs` is fixed and xgboost uses `tree_method="hist"` with deterministic settings.

### 3.3 Web data bundle (budgets enforced in CI by `tools/check_bundle_size.mjs`, gzip sizes)
| Asset | Content | Budget |
|---|---|---|
| `explore/legacy.bin` + `meta.json` | 25,242 records × {lon f64, lat f64, day u16, hour u8, cat u8, status u8, premises u8, location u8, event_class u32}, columnar binary, little-endian. `event_class` is an integer equivalence-class ID: the UI needs only distinct-ID **counts**, and the CSV export has no IDs, so no strings ship. About 0.68 MB raw; float64 low bytes barely compress | ≤ 0.6 MB gz; loaded first |
| `explore/v2.bin` | + auto theft and B&E 2020–23 (~60K more, ~85K total), about 2.3 MB raw, fetched only when those categories are switched on | ≤ 2.0 MB gz |
| `explore/fixtures.json` | test-only, not deployed | — |
| per-page results JSON (explain, predict, overview, methods) | aggregates only | ≤ 150 KB each |
| Fonts (Inter + Source Serif 4 subsets, woff2) | | ≤ 150 KB |
| JS core / Vega chunk / MapLibre chunk | route-split | ≤ 180 / 300 / 260 KB |
| Basemap | Protomaps PMTiles Toronto extract, **maxzoom 14**, HTTP range requests (only viewed tiles load). **Not committed:** `pages.yml` downloads a pinned build and checks its sha256. Glyph ranges and sprites are self-hosted (only the ones used). ODbL / © OpenStreetMap attribution is shown on the map | file ≤ 45 MB (GitHub warns at 50); glyphs + sprites ≤ 300 KB; per-view ≤ 1 MB |
| `paper.pdf` | | ≤ 3 MB |

Coordinates ship as float64 (no rounding) so boundary cases match R exactly. Event IDs are dictionary-encoded so distinct-ID counts stay exact.

### 3.4 Never touch anything outside this folder
- Python lives in `./.venv`. R packages go to `./.r-lib` (`R_LIBS_USER`).
- Caches are redirected into `./.cache/`: `PIP_CACHE_DIR`, `npm_config_cache`, `PLAYWRIGHT_BROWSERS_PATH`, `TECTONIC_CACHE_DIR`, `XDG_CACHE_HOME`, `R_USER_CACHE_DIR`, `R_USER_DATA_DIR`, `R_USER_CONFIG_DIR`, `TMPDIR`.
- Anything that must be installed outside the folder (e.g. Homebrew `libomp`, another Python) is **asked about first**, never done silently.
- `make env` sets all of these. `_reference/` is made read-only after cloning.
- R re-runs execute on **copies** in `build/r-work/` (gitignored), never in `_reference/`.

## 4. Re-running the R originals (`parity/r/`, Phase 2)

- **Environment:** `TZ=America/Toronto LC_ALL=en_CA.UTF-8 R_LIBS_USER=./.r-lib`. `install_r_lib.R` installs pinned versions into `./.r-lib`:
  - shiny, testthat, shinytest2 (from Explorer `DEPENDENCIES.csv`);
  - **xgboost 1.7.8.1** (CRAN archive), so caret's `xgbTree` runs;
  - caret pinned to the installed 7.0.1.
  
  `sessionInfo()` is saved to `parity/r_outputs/session_*.txt`.
- **Minimal, documented patches** (`PATCHES.md`, each one a unified diff against the reference file):
  1. Read local `data/raw/` instead of GitHub raw URLs.
  2. Remove `download.file()` (it overwrites the xlsx).
  3. Add export hooks only. **Patches never change any modelling logic.** The hooks write:
     - the full `train_data` and `test_data` frames as CSV (the R frame has no row ID, and `merge()` reorders rows by collation, so indices can't be replayed);
     - test predictions and probabilities for all 6 models, plus confusion matrices;
     - the rpart cptable with the chosen cp and nsplit, gbm settings (including `n.minobsinnode`), and caret `bestTune` and `$results`;
     - STA303's GLM coefficients and vcov, the glmnet λ grid with `cvm`/`cvsd`/`lambda.min`, the `calibrate()` matrix and printed stats, and influence vectors;
     - Explorer coordinates as `sprintf("%a")` hex doubles, plus R's row order;
     - every chart aggregate.
- **JSC370:** first try `LC_COLLATE ∈ {en_CA.UTF-8, C}` to see whether either reproduces the published split (848 robberies in test). Record the result. The reference is the re-run. The published table is stored too, so PARITY.md shows three columns: published / R re-run / Python.
- **STA303:** knit the copy twice and confirm the outputs are identical. `calibrate()` is reproducible because `set.seed(123)` at the LASSO chunk is the last RNG use before it. No seed is added. A separate script rebuilds glmnet's `foldid` (`set.seed(123); sample(rep(1:10, length = n))`, checked against the cv.glmnet result) so Python can use the same folds.
- **Explorer:**
  - run `tests/test_analysis.R` (expect 28/28) and `tests/test_shiny.R`;
  - rebuild `crime.rds` and confirm the MD5 is byte-identical;
  - `explorer_fixtures.R` calls the original `R/analysis.R` functions over a fixture grid (§5.1) and writes `fixtures.json`.
- **The xgboost 1.7 build may need Homebrew `libomp`**, which lives outside this folder, so **ask first**. Try the CRAN macOS binary from the archive before compiling.
- **Fallback if xgboost 1.7 won't build from source:** replicate caret's default `xgbTree` grid (108 combos, 10-fold, accuracy) against xgboost 3.2's native API in a patch file. Log it as a deviation in PARITY.md.

## 5. Phases, acceptance criteria and parity checks

A "sitting" is one focused session of about 2–3 h with a fresh context. Each starts by reading `PROGRESS.md`.

### P0. Plan (this document) · 1 sitting · done when PLAN/PROGRESS/AGENTS/CLAUDE exist and are approved

### P1. Setup and inventory · 1 sitting
**Tasks**
- **First, get the user's answer to Q5 (installs).** Nothing is downloaded before that.
- Already done in P0: `.gitignore`, `_reference/STA303_Final_Report.Rmd`, `_reference/notes/` (copies of the resume-bank notes, so the folder is self-contained). Resume and transfer rules are in `RESUME.md`.
- `git init` (local only, branch `main`).
- Clone both repos into `_reference/`, check out the agreed SHAs, copy `STA303_Final_Report.Rmd` into it, `chmod -R a-w`.
- Write `.gitignore`.
- Create `.venv` and lock deps: pandas, pyarrow, pandera, statsmodels, scikit-learn, xgboost, scipy, altair, vl-convert-python, pytest, ruff, openpyxl.
- Run `npm create vite` (react-ts) in `web/`.
- Create `.r-lib`.
- `make data` with checksums.
- Verify the licence terms for TPS and City of Toronto data and write `DATA_LICENSE.md`.
- **Spikes**, each about 30 minutes, recorded in PROGRESS.md:
  - PMTiles range requests on a static host (`vite preview` plus a GitHub Pages-like header check);
  - `vl-convert` PDF output keeps text as text and embeds static Inter;
  - tectonic + fontspec builds with static Source Serif 4;
  - React Router 7 framework mode with `prerender` and a `/toronto-crime-analytics/` base.

**Acceptance**
- `make data` passes checksum verification.
- `python -c "import statsmodels, sklearn, xgboost"` works.
- Tool versions are recorded in PROGRESS.md.
- `parity/inventory/*.md` exist, covering every chart, table, number and caveat of each original.

**Parity check:** none yet. This phase captures the baseline.

### P2. R reference re-runs · 1–2 sittings
**Tasks:** everything in §4.

**Acceptance**
- `parity/r_outputs/` holds the reference outputs for all 3 projects.
- Explorer 28/28 and shinytest pass; the RDS rebuild is byte-identical.
- STA303 knits; n = 174,976.
- JSC370 knits with xgboost.
- Published-vs-rerun differences are tabulated in PARITY.md §JSC370.

### P3. Shared Python pipeline · 1 sitting
**Tasks**
- `io`, `schema`, `definitions`, `features`.
- Builders `jsc370_legacy`, `sta303_legacy`, `explore_legacy` reproduce each original's quirks behind explicit, named flags:
  - `drop_dst_gap_rows=True`
  - `dow_sunday_first=True`
  - `character_as_codes=True` for the RF port
- `unified` is the clean shared table (§2).
- pytest for schemas and definitions.

**Parity check (exact)**
| Table | Requirement |
|---|---|
| `explore_legacy` vs `crime.rds$events` | 25,242 rows; identical values in all 10 columns; float64 bit-equal coordinates; same per-file manifest counts |
| `sta303_legacy` | 174,976 rows; class counts 33,919 / 58,434 / 70,143 / 12,480; equal to the R model frame |
| `jsc370_legacy` | exact multiset match against R `final_data` (16,611 rows; 2,779 robberies; 158/158 neighbourhoods matched); census features within 1e-12 |

**CSV reading must be exact:**
- pandas runs with `float_precision="round_trip"` and keeps the UTF-8 BOM handling.
- Empty strings and NA follow R's reader. Explorer `x[is.na(x)] <- "Unknown"` is mirrored.
- Coordinates are compared with R's `%a` hex export, and the web bundle takes its doubles from R's export if any differ.
- Sort order: replicate `order(date, category, event_id)` with a stable sort under R's collation, or use R's exported order.

**Unified-table check:** before the within-category dedup, count events that appear in more than one MCI category (e.g. robbery and auto theft with the same `EVENT_UNIQUE_ID`). Report the count and choose a rule (keep all, logged, or drop as ambiguous), so one incident is never labelled both positive and negative without saying so.

### P4. Faithful ports · 2–3 sittings · three parallel tracks

**4a Explain (STA303).**
- statsmodels GLM (binomial, IRLS tolerance 1e-10).
- Stepwise AIC/BIC (both directions, same k).
- LRT.
- **R's formulas implemented directly**, not the statsmodels defaults:
  - GVIF uses `car::vif`'s `cov2cor(vcov)` method;
  - `dfbetas` and `dffits` use `lm.influence` on the IRLS weights with leave-one-out σ₍ᵢ₎;
  - Cook's distance as R defines it.
  
  Validate each against R on a 2k-row subsample first, then on the full data.
- The Q-Q plot of **working residuals** is ported as-is.
- LASSO: glmnet-equivalent coordinate descent on R's exact design (`- 1`, full Covid dummies), λ grid and foldid. The cv.glmnet deviance curve (`plot(cv_out)`) is ported.
- ROC with the "AUC = x.xx" label; `calibrate()` plot and printed stats.
- The full `summary(model)` table.
- The Gaussian "final" table, reproduced as-is.

**4b Predict (JSC370).** All 6 models train on **R's exported `train_data` / `test_data` frames**.
- **GLM:** statsmodels IRLS. The aliased column `Difference_in_Individual_Median_Average_Income` (= Avg − Median in all 158 neighbourhoods) is dropped the way R's pivoted QR does it, i.e. R reports an NA coefficient.
- **Tree, Bagging, RF, GBM, XGB** are fit at **R's chosen hyperparameters**:
  - Tree: rpart's chosen cp mapped to the same number of splits.
  - Bagging and RF: 500 trees, mtry 17 / 4, character columns as integer codes, as R did.
  - GBM: 100 trees, depth 1, lr 0.1, subsample 0.5, `min_samples_leaf=10`.
  - XGB: caret's `bestTune`, on caret's `model.matrix` dummy design, with `tree_method="exact"` and `base_score=0.5`.
  
  Python's own CV-selected hyperparameters appear as a separate, labelled row.
- **Known implementation limits, recorded in PARITY.md:** rpart and gbm split factors into level subsets, and sklearn cannot.
- Every original output is ported: train and test accuracy, 6 confusion matrices, GLM ROC (+ AUC), the full, cp and pruned tree plots, `varImpPlot` for Bagging and RF, the RF importance bar chart.

**Original JSC370 site content also in scope:**
- Fig 2's faceted ggplot variant and the plotly `scattergeo` map (merged with Fig 5).
- The `index.Rmd` and `variable.Rmd` stat cards (16,611; 16.7%; Moss Park; 9 / 24 / 7).
- `model.Rmd`'s hard-coded metrics and narrative claims ("Bagging excels in recall", RF chosen for precision), each checked against the re-run.
- **Fig 5** (2020 robberies by premises) is rebuilt from `jsc370_legacy` as an aggregate plus a static point layer. The Explorer data is deduped, covers 2020–23, keeps NSA and has no DST drop, so a filter preset can't reproduce Fig 5; the preset is only a link.

**STA303 prose numbers:** "GVIF ≈ 1.84", AIC keeps 6/6, BIC drops 2.

**4d Design tokens (end of P4, blocks P5 figures):**
- `design/tokens.json`, the Vega-Lite theme and a palette validation report.
- The categorical palette is finalised with the dataviz validator:
  - every mark ≥ 3:1 on `bg` in both modes;
  - robbery is the only warm, saturated hue;
  - all pairs shown together on the Explore map stay distinguishable under protan, deutan and tritan simulation.

**4c Explore.** Needs the user's answer to Q2 first.
- `web/src/explore-engine` is a pure TS port of `R/analysis.R`. It uses integer day numbers, ISO weekday, Monday weeks, the R haversine constant and clamp, inclusive bounds, NA-gap semantics and eligible-day counts.
- Python `explore/export.py` writes the binary bundle and `fixtures.json` (from R, P2).
- vitest runs every fixture.
- The CSV export is built to byte-equal R's `write.csv` output (the filename date is excluded).

**Parity tolerances**
| Item | Tolerance |
|---|---|
| **Explore:** all fixture cases (see grid) | **exact** integers; identical NA positions; identical CSV bytes |
| **STA303:** n, class counts, df, selected variable sets (AIC: 6/6, BIC: 4) | exact |
| STA303 coefficients, SEs, z, ORs, AIC/BIC/deviance, LRT χ², GVIF, AUC (deterministic) | **rtol 1e-6 on raw values**, and displayed values identical at the original's rounding (coefficients 4 dp, ORs 3 dp) |
| STA303 influence vectors (DFBETAS, DFFITS, Cook's, working residuals) | rtol 1e-6; top-20 indices exact |
| STA303 LASSO (identifiable quantities only) | Covid1−Covid0 contrast and all other coefficients within 1e-4; linear predictor max \|Δ\| < 1e-4; penalised objective rtol 1e-6; zero pattern identical. λ grid, `cvm` and `lambda.min` match when the same `foldid` is used |
| STA303 calibration | apparent curve within 1e-3 (R-style `lowess(iter=0)` on rms's grid); printed n / mean abs error / MSE / 0.9 quantile within 1e-3. Bias-corrected curve within 0.02, since rms's internal fold draw can't be replayed |
| STA303 Gaussian LM table | rtol 1e-6 |
| **JSC370:** data and split | exact (trained on R's exported frames) |
| JSC370 GLM | **identical confusion matrix**; coefficients rtol 1e-6; aliased term NA in both |
| JSC370 Tree / Bagging / RF / GBM / XGB, at R's hyperparameters | test TP and FP each within max(10, 10% of R's count); F1 ±0.04. Undefined precision (no positive predictions) is reported as such, not as 0 |
| JSC370 ranking | **tier rule:** sort by point F1, then walk down the list. A model starts a new tier when the paired-bootstrap 95% CI of ΔF1 against the current tier leader excludes 0 (1,000 reps, seeded, **same bootstrap indices** for R's and Python's predictions). Pass = identical tier partition. Also the same top-3 RF importance set |
| **Charts** (`compare_charts.py`) | each chart's underlying aggregate equals R's exactly. A checklist per chart covers chart type, encodings, sort order, category→colour mapping and stated message. Mismatched messages are flagged and **left as original** until P5 |

**Explore fixture grid** (generated in R from the original functions):
- 15 destinations × 2 modes (destination / nearest station) × radius {100, 300, 500, 1000, 1100, 1200, 2000} × 6 presets;
- weekday subsets {all, Mon–Fri, Sat–Sun, Mon};
- hour ranges {0–23, 6–9, 19–23, 7–7};
- category subsets (all 7 non-empty combos);
- date ranges {full, 2023-04-01..2023-04-03, 2021 only}.

Sample about 3,000 combinations: all the boundary cases above, plus the 15×2 default table and the VALIDATION.md values (566/563, 702/697, 8,455).
- Every case stores records, distinct IDs and the 3 bar-chart vectors, plus **sha256** of the canonical daily, weekly and monthly arrays (NA kept) and of the CSV text.
- About 100 cases store the full arrays and CSV, to help debugging.
- Fixtures stay under 3 MB.

**Gate:** PARITY.md is all green, or deviations are explicitly accepted by the user. Then commit and tag `parity-pass` locally.

### P5. Analytical improvements · 2–3 sittings
Each one gets a CHANGES.md row: id, area, old value, new value, why, results key.

**5.1 STA303 v2 (`explain/sta303_v2.py`)**
1. The summary model becomes the binomial GLM with ORs and 95% CIs.
2. Window becomes 2014–2023, with the pre-2014 late-reported rows excluded.
3. `Covid_Outbreak` is renamed "post-2019 period"; text gives no causal COVID claim.
4. Hour becomes a 24-level factor (reference 12:00) and month a 12-level factor. Season is dropped (aliased with month).
5. Fixed-cutoff darkness is aliased with hour, so it is replaced by **solar darkness**: the sun below civil twilight at the incident's hour midpoint, computed with NOAA solar equations for Toronto (no data download).
   - Local clock time is converted to UTC with `zoneinfo`. The DST spring-forward gap and the repeated fall-back hour are handled explicitly and their counts logged.
   - With hour and month as factors, darkness is identified only by twilight hours that are dark on some dates and light on others. The text says so.
   - Sensitivity check: a cyclic-harmonic model (hour sin/cos k = 1–3, month k = 1–2). Compare by AIC/BIC.
6. Cluster-robust SEs by neighbourhood, after dropping NSA rows (logged). Report both standard and robust CIs.
7. Seeded calibration; 5-fold CV AUC.
8. **Composition check:** refit robbery vs each negative category separately, and report the post-2019 OR for each, so the paper can say how much of the effect comes from the auto-theft surge.
9. Remove dead code (`crime_2020`, `head(crime)`).

**5.2 Ablation ladder (`predict/ablation.py`)**
- **Rows:** identical rows for every rung. The `unified` table: 2014–2023, census-joined, NSA dropped.
- **Rungs:**
  - L0 prevalence baseline
  - **L1** time-only logistic: hour, weekday, month cyclic, solar darkness
  - **L2** + location/premises logistic: premises, location type, lon/lat spline basis
  - **L3** + census logistic: 9 census features, standardised
  - **L4** Random Forest on L3 features
  - **L5** XGBoost on L3 features
- **No-premises ablation:** L2–L5 rerun without premises and location type.
- **Evaluation design**
  - **A, neighbourhood-grouped CV:** StratifiedGroupKFold, 5 folds, groups = 158 neighbourhoods. Tuning uses inner grouped 3-fold CV within each training fold (small seeded grids). The threshold maximises F1 on inner out-of-fold predictions and is then applied to the outer fold.
  - **B, temporal holdout:** train on OCC_YEAR ≤ 2021, test on 2022–2023. Tuning and threshold use grouped CV inside the training years only.
  - **Prior shift:** prevalence is reported per split, since robbery share falls over time. PR-AUC is always shown next to its prevalence baseline.
- **Metrics:** ROC-AUC, PR-AUC (average precision), F1, precision and recall at the tuned threshold.
- **CIs:** 95% **cluster bootstrap by neighbourhood**, 1,000 reps, seeded. Paired bootstrap Δ between adjacent rungs answers "what does each feature group add?"
- **Also:** grouped permutation importance (time / location / premises / census blocks) for L5; PR curves for every rung; calibration curves (site only).
- **Leakage guards (pytest):** no neighbourhood appears in both train and test of a fold; temporal split years are disjoint; scalers and encoders are fit inside folds only.
- **Compute budget**, set up front. Run locally only; CI never retrains.
  - RF: 300 trees with `max_samples=0.5`. XGB: hist, early stopping on the inner fold. Grids of ≤ 12 combinations per model.
  - Fitted out-of-fold predictions are cached as parquet, so bootstraps (1,000 reps) resample predictions instead of refitting.
  - Target: the full P5 run takes ≤ 3 h on this Mac. Measure on a 10% sample first and record the projection in PROGRESS.md.

**5.3 Other fixes**
- XGBoost grid fix: JSC370's intended `tune_grid` is actually used. The port shows "as-run (caret default)" vs "as-intended" on the original 2020 split.
- Seeds everywhere (§3.2).
- The original 0.5 threshold is kept in the port tables, labelled.
- Caption corrections for JSC370 Figs 2–4, with data-backed text. Fig 2 is recomputed at neighbourhood level instead of incident-replicated.

**5.4 Inference vs prediction comparison (paper §4.3, Explain/Predict cross-links)**
For the same time features, set side by side:
1. GLM ORs (statistically clear);
2. L1's AUC and the paired ΔAUC/ΔPR-AUC each block adds;
3. L5 grouped permutation importance.

The message: statistically clear is not the same as predictive.

**Acceptance**
- Every result is in `results/` with provenance; RESULTS.md has an entry for each.
- pytest is green, including leakage guards.
- Two runs give identical hashes.
- CHANGES.md is complete.

### P6. Design system and website · 3–4 sittings · can start after P4 on port results; numbers are wired in after P5
**Tasks**
- `design/tokens.json` → `tokens.css`, Vega config, LaTeX colours.
- The component library (§6.4) and all 7 pages (§7).
- Explore v2 categories, URL-encoded filter state, the Explore parity suite in CI.
- Prerendered routes, so every page is static HTML on GitHub Pages and deep links work:
  - React Router 7 **framework mode** (`@react-router/dev` Vite plugin, `react-router.config.ts` with `ssr:false` and `prerender: [all routes]`);
  - `basename` and Vite `base` set to `/toronto-crime-analytics/`;
  - `__spa-fallback.html` copied to `404.html`.
- MapLibre and Vega are imported **client-only** (lazy, inside effects), so the Node prerender never loads them.
- Results JSON is imported at build time, so every number is in the prerendered HTML.
- Each chart first shows its prerendered SVG (the same Vega-Lite spec, rendered by vl-convert at build) and swaps in interactive Vega on idle or interaction. Optionally precompile Vega-Lite to Vega to drop the compiler (~75 KB).
- Explore reads its URL query state after hydration.

**Acceptance**
- `npm run build` stays within the §3.3 budgets.
- vitest green, including 100% of Explore fixtures exact.
- Playwright smoke on every route at 375 / 768 / 1280 px, in light and dark.
- axe: zero serious or critical issues. Lighthouse accessibility ≥ 95 and performance ≥ 85 (mobile), Explore excepted at ≥ 70.
- No literal numerals in `web/src/content` except dates and labels (lint rule). Every rendered number comes through `<Num>` from results JSON.
- **10-second test:** each page's H1 is a one-sentence finding, and its main visual sits above the fold at 1280×800 and 375×812.

### P7. Paper · 2 sittings
**Tasks**
- LaTeX with tectonic (§8).
- Figures are rendered from the **same Vega-Lite specs** by `vl-convert` to vector PDF with embedded Inter.
- Tables come from `results/` via Python to `.tex`. Every number comes through `\res{explain.or_post2019}`: `generated/numbers.tex` defines each value under a `\csname`-safe key, and `\res` looks it up and errors on an unknown key. This avoids clashing with siunitx's `\num`, and dotted keys are fine.
- Fonts are **static** OTFs (Source Serif 4 400/600, Inter 400/500/600; no variable fonts in XeTeX or resvg). vl-convert registers them with `register_font_directory`. CI checks that `pdffonts` shows them embedded and that figure text is extractable.
- Draft target: **6.3 pages**, keeping 0.7 page of slack under the hard 7-page cap.

**Acceptance**
- `tools/check_page_count.py` reports ≤ 7 pages total.
- No literal numerals in `sections/*.tex` outside citations, years and section refs (lint).
- Compiles warning-free (no overfull boxes > 1pt).
- The PDF is copied to `web/public/paper/`.

### P8. Review loop · 1–2 sittings
- Honesty audit, then fixes. Design review, then fixes. Repeat until clean (§10).
- Final `make all` in a new `build/fresh/` checkout (its own `_reference/` clone; nothing existing is deleted) reproduces identical result hashes on this machine.

### P9. Release · 0.5 sitting · **every step needs the user's explicit OK**
- README (with screenshots), LICENSE, DATA_LICENSE.
- Ask before `git push`.
- Ask before enabling and deploying GitHub Pages (`pages.yml` via `actions/deploy-pages`; the user sets Pages source to "GitHub Actions").
- Ask before any deletion.
- Suggested old-repo pointer READMEs are **listed, not done** (they sit outside this folder).

**Sittings total: about 15–20.**

## 6. Design system spec (`design/DESIGN.md`, tokens in `design/tokens.json`)

### 6.1 Libraries (one each)
- **Charts: Vega-Lite 5** (React via `vega-embed`; Python via Altair + `vl-convert`).
  - The *identical* JSON spec and theme config render on the site and as vector PDF figures in the paper, so there is one design system with no restyling drift.
  - Declarative layering covers every needed form: forest plots, error-bar ladders, PR curves, small multiples, index plots, boxplots.
  - Built-in interval selections give linked brushing in Explore. It emits ARIA descriptions.
  - Each chart also has a "View data table" toggle for screen readers.
  - Cost: about 280 KB gz, lazy-loaded per route.
  - Rejected: Plotly (≈1 MB, weak print output); Observable Plot (needs a JSDOM pipeline for the paper); Recharts (no print path, limited statistical forms).
- **Map: MapLibre GL JS** with a self-hosted **Protomaps PMTiles** Toronto basemap.
  - WebGL draws about 85K points smoothly; there is built-in clustering and a data-driven style per category.
  - Light/dark basemap themes come from the same tokens.
  - No API key and no third-party tile server, so the map is always on. That also avoids OSM's tile-usage policy for public deployment.
  - Fallback: OpenFreeMap vector tiles if GitHub Pages range requests misbehave (§12).
- **UI primitives:** Radix UI (Slider, Checkbox, Select, Tabs, ToggleGroup, Collapsible, Dialog for the mobile filter sheet), for accessible keyboard and ARIA behaviour. Styling uses CSS Modules + CSS custom properties. No CSS framework.

### 6.2 Typography
- **Inter** (variable, OFL) for UI, body and all figures, with tabular figures (`tnum`) in tables, totals and axes.
- **Source Serif 4** (OFL) for paper body text only. Fonts are self-hosted as woff2 subsets for the site and as OTF in `paper/fonts`.
- **Scale** (major third, 1.25; rem at 16px):

| Token | Size / line-height | Use |
|---|---|---|
| `xs` | 12.8 / 1.4 | axis ticks, footnotes (minimum) |
| `sm` | 14 / 1.5 | captions, table cells, labels |
| `base` | **16 / 1.6** | body |
| `lg` | 20 / 1.4 | dek, card titles |
| `xl` | 25 / 1.3 | H2 |
| `2xl` | 31 / 1.2 | H1 on mobile |
| `3xl` | 39 / 1.15 | H1 on desktop |
| `display` | 48 / 1.05 | finding-card numbers |

- Weights: 400 / 500 / 600 (static instances, matching the paper). Prose measure is `max-width: 68ch` (about 70 characters). Charts may span the 1,200 px container.

### 6.3 Colour (WCAG-checked in both modes; validated with the dataviz skill's validator, or `tools/check_palette.py` + CVD simulation)
- **Neutrals**

| Token | Light | Dark |
|---|---|---|
| `bg` | `#FFFFFF` | `#0F1216` |
| `surface` | `#F5F6F8` | `#171B21` |
| `border` | `#D9DDE3` | `#2B313A` |
| `text` | `#15181C` | `#E7E9EC` |
| `text-muted` | `#4B535E` | `#A3ABB6` |
| `accent` (links/focus) | `#0B57A4` | `#79B8FF` |

  Text tokens are ≥ 7:1, muted ≥ 4.5:1, focus ring 2px `accent` with 3:1 against neighbours.
- **Categorical (Okabe–Ito; fixed meaning across site, map and paper)**

  Starting points; the final hexes are fixed by the P4d validator:

| Category | Starting colour | Constraint |
|---|---|---|
| Robbery | `#D55E00` vermillion | the only warm, saturated hue |
| Auto theft | `#0072B2` blue | |
| Break & enter | `#009E73` bluish green | |
| Theft over | `#CC79A7` reddish purple | |
| Bicycle theft | `#8C6D1F` dark ochre | Okabe–Ito orange `#E69F00` fails 3:1 on white and is close to robbery under protan/deutan simulation |
| "Other property crime" (pooled) | slate `#6B7785` | |

  Every mark must be ≥ 3:1 on `bg` in both modes, using dark-mode variants where needed. The Explorer's original colours change, which is logged as a restyle in PARITY.md.
- **Ordered (ablation rungs L1–L5):** single-hue blue ramp, 5 steps, with the darkest step ≥ 3:1 on `bg`.
- **Evaluation designs:** grouped CV = filled marker; temporal holdout = hollow marker. No-premises = dashed.
- **Effects (forest plot):** neutral marks with a reference line at OR = 1. Colour is used only to highlight the 3 effects named in cards.
- **Map density:** cividis-like sequential ramp.
- Colour is never the only channel: markers, line dashes and direct labels are added.

### 6.4 Components
- `AppShell`: skip link, top nav (7 items, collapses to a menu < 768 px), theme toggle (system / light / dark; saved preference), footer with data licence, repo link and build SHA.
- `PageHeader`: eyebrow, **H1 = the page's finding in one sentence**, dek of up to 2 lines, "Source:" chip linking to the results key.
- `FindingCard`: display number, unit, 95% CI, one-line meaning, "what this does not mean" tooltip, provenance key.
- `Figure`: title (the takeaway), subtitle (what is plotted), VegaChart, caption, source and n, "View data table" toggle, download SVG/CSV.
- `Callout`: info / caveat / warning variants, with an icon and text label.
- `DataTable`: sticky header, tabular numerals, right-aligned numbers, CI columns, sortable.
- `Disclosure`: for "Model checks", keyboard-operable and deep-linkable.
- `SegmentedControl`, `Tabs`.
- `FilterPanel`: date range, category checkboxes with colour chips, preset select, weekday toggles, hour range slider, mode radio, destination select, radius slider, reset.
- `LiveTotals`: records · distinct IDs; `aria-live="polite"`.
- `MapView`, `Legend`, `Num` (number from results, with formatting rules and a provenance title attribute).
- Spacing: 4 px base (4, 8, 12, 16, 24, 32, 48, 64, 96). Radius 6 px. Elevation via border, not shadows.
- Breakpoints: 375 / 768 / 1024 / 1280. Honours `prefers-reduced-motion`.

## 7. Information architecture and page wireframes (text)

**Navigation:** Overview · Explore · Explain · Predict · Paper · Methods · About

Two changes from the proposed IA:
1. **Methods & Limitations** becomes **Methods**, whose sections are Data, Variables, Methods, Limitations and Reproducibility. Limitations is pinned as a visible section in the page TOC, so it stays prominent. This gives the JSC370 "Key Variable Statistics" page a natural home.
2. A small **About** page holds acknowledgements, team credits and licences, so the JSC370 "Acknowledgements" page has a home without diluting Methods.

**H1 copy is written in P6 from final results.** The wireframes below give structure only.

- **Overview**
  - H1: the question in one sentence, using the §2 framing.
  - Dek: one sentence on the data (n, years, source).
  - Row of 3 `FindingCard`s, linked to Explain / Predict / Predict:
    1. post-2019 OR with CI;
    2. time-only → full-model PR-AUC with CI (grouped CV);
    3. how much is lost without premises.
  - "One dataset, three lenses" strip: Explore → Explain → Predict, one line and a link each.
  - Paper CTA: title, page count, PDF button.
  - Caveat callout: "Counts are reported incidents, not risk."
  - Mobile: cards stack, CTA stays above the footer.
- **Explore**
  - Desktop: sticky left `FilterPanel` (320 px). Main column, top to bottom:
    - `LiveTotals` bar, with mode chip and active-filter summary;
    - map (60 vh; clusters at low zoom; radius circle and centre marker when local; destination **and** station drawn in station mode, fixing the original's gap);
    - "Records over time" trend (daily / weekly / monthly segmented control, default weekly; Monday weeks and partial-period note in the caption; brushing sets the date range);
    - row of 3 bar charts (category, weekday Mon–Sun, hour 0–23) in category colours;
    - inline caveats beside the relevant control (records vs distinct IDs, not exposure-adjusted, nearest *listed* station, illustrative exam presets, bicycle statuses);
    - CSV download.
  - Mode radio: Citywide / Near a destination / Near its nearest listed station. This replaces the Destinations and Transit tabs.
  - Destination and radius controls show only when local.
  - State lives in the URL query.
  - Presets include "JSC370 Fig 5: 2020 robberies by premises".
  - Mobile: totals sticky at top; "Filters (n)" button opens a bottom sheet; map 50 vh; charts stack.
- **Explain (STA303)**
  - H1: finding.
  - **Main visual:** forest plot of ORs with 95% CIs (log x-axis, grouped by period / hour / month / weekday / darkness, reference line at 1), with direct labels.
  - Beside it on desktop, below on mobile: 3 plain-language effect cards (e.g. "Incidents after 2019 had X× the odds of being robbery …"), each with a "does not mean" line and the composition caveat.
  - "Patterns in the data" section: JSC370 Figs 2–4 restyled, with a segmented control season / month / day / hour.
  - "Original vs corrected model" table.
  - **Model checks** disclosure: VIF; AIC/BIC/LASSO/LRT selection table; LASSO path; ROC + AUC; calibration; DFBETAS / DFFITS / Cook's (pre-rendered); Q-Q note.
  - Limitations callout.
- **Predict (JSC370 + new work)**
  - H1: finding.
  - **Main visual:** ablation ladder. x = rung L0–L5; y = PR-AUC with 95% CI; filled = grouped CV, hollow = temporal holdout; dashed = no-premises; prevalence baseline as a reference line. A metric switch toggles ROC-AUC / PR-AUC / F1.
  - Model table: all rungs, all metrics, CIs, prevalence row.
  - PR curves (small multiples per design).
  - Feature importance: grouped permutation for L5, plus the original RF Gini restyled.
  - Temporal holdout section with a prior-shift note.
  - "Original JSC370 benchmark": 6-model table with published / R re-run / Python columns and the tier ranking; census scatter (Fig 1); ROC; link to the Explore Fig 5 preset.
- **Paper**
  - Title, authors, abstract.
  - Embedded PDF (`<object>`) on ≥ 768 px; download button always visible (mobile shows the button only).
  - BibTeX citation.
  - "Original course reports": JSC370 PDF and STA303 links.
- **Methods**
  - Sticky TOC.
  - **Data:** sources and licence, the §2 definition, a sample-flow diagram with counts per filter.
  - **Variables:** JSC370 Key Variable Statistics table + 4-panel counts.
  - **Methods:** inference, prediction, evaluation design.
  - **Explorer data:** dedup, haversine, presets.
  - **Limitations.**
  - **Reproducibility:** `make all`, checksums, versions, the parity summary linking PARITY.md.
- **About**
  - Credits: JSC370 (solo), STA303 (solo), STA313 (team of 6, led by Kaiwen Yang; see Q2).
  - Course acknowledgements (verbatim JSC370 text).
  - Licences; the video link.

## 8. Paper outline (LaTeX, ≤ 7 pages total including references)

**Format:** single column, 10.5 pt Source Serif 4, 0.8 in margins, figures in Inter, colours from tokens, `natbib`, compiled with tectonic.

**Title (working):** *"When and where: inference and prediction for robbery among major property crimes in Toronto, 2014–2023."*

| § | Content | Pages | Figures and tables |
|---|---|---|---|
| — | Title, abstract (≤ 180 words: framing, data, both analyses, key numbers via macros) | 0.4 | — |
| 1 | Introduction: motivation; inference vs prediction; honest task framing; contributions (corrected GLM, ablation under grouped and temporal evaluation, inference-vs-prediction contrast) | 0.6 | — |
| 2 | Data and task definition: TPS MCI + 2021 Neighbourhood Profiles; definition; sample flow; composition shift over time | 0.8 | **Fig 1** robbery share and category counts by year (shows the auto-theft surge). **Tab 1** sample flow and class counts |
| 3 | Methods: 3.1 GLM (factors, solar darkness, robust SEs, selection); 3.2 ladder L0–L5 and the no-premises ablation; 3.3 evaluation (grouped CV, temporal holdout, nested tuning, threshold, cluster bootstrap) | 1.2 | — |
| 4.1 | Results, inference | 0.8 | **Fig 2** OR forest plot. **Tab 2** original (Gaussian) vs corrected key terms, compact |
| 4.2 | Results, prediction | 1.1 | **Fig 3** ablation ladder with CIs, both designs. **Tab 3** metrics (ROC-AUC, PR-AUC, F1, P, R, with CIs) |
| 4.3 | Inference vs prediction | 0.5 | **Fig 4** paired panel: OR magnitude vs ΔPR-AUC and permutation importance per feature block |
| 5 | Discussion and limitations: crime-type composition, not risk; premises near-definitional; census constant within neighbourhood and over time (2021 profile); reporting bias; coordinate offsetting; prior shift; large-n significance | 0.8 | — |
| 6 | Conclusion | 0.2 | — |
| — | Code and data availability (one paragraph) + references (~12) | 0.5 | — |
| | **Total** | **6.9** | 4 figures, 3 tables |

- PR curves, calibration and the original 6-model benchmark are site-only (the page budget does not allow them). The paper points to the site for them.
- The Explorer is not in the paper.
- If the PDF runs over 7 pages, cut Tab 2 first, then fold Fig 4 into Tab 3.

## 9. Subagent assignments and skills per phase

| Phase | Subagents (parallel unless noted) | Skills / tools |
|---|---|---|
| P1 | 3 inventory agents, one per original (read-only; write `parity/inventory/*.md`); 1 setup agent (env, data, licence check) | — |
| P2 | `r-rerun-explorer`, `r-rerun-sta303`, `r-rerun-jsc370` (each works only in `build/r-work/<proj>`); after them, 1 parity-ledger agent | — |
| P3 | 1 pipeline agent (sequential; others depend on it) | `code-review` at end |
| P4 | `port-explain`, `port-predict`, `port-explore` (TS engine + bundle), `design-tokens` (4d), all in parallel; then `parity-checker` (independent, read-only, runs compare scripts and fills PARITY.md) | `dataviz` (4d palette validation), `code-review` |
| P5 | `improve-explain`, `improve-predict` (ablation), in parallel; `figure-specs` agent (Vega-Lite specs + theme); honesty auditor pass 1 on results/RESULTS.md | `dataviz` (palette validation, chart forms) |
| P6 | `web-build` (shell, design system, pages); `explore-ui` (Explore page); `design-reviewer` (Playwright screenshots 375/768/1280 × light/dark per page, critique of hierarchy, readability and the 10-second test) | `dataviz`, `run` (dev server), Playwright, in-app browser |
| P7 | `paper-writer` (sections, macros); `paper-figures` (vl-convert export) | `pdf` (page count, text extraction for audit) |
| P8 | `honesty-auditor` (every number on site + PDF vs RESULTS.md; runs `tools/audit_numbers.py` then manual pass); `design-reviewer` pass 2; `code-review` (high), `security-review` | `pdf`, `code-review`, `security-review`, `simplify` |
| P9 | none: the main agent asks the user before each push or deploy | — |

**Review agents** are read-only. They write only to `reviews/` and never fix what they audit; fixes go back to the owning agent.

**Honesty auditor method**
1. Extract every numeral from prerendered HTML (Playwright `innerText` per route, after data loads) and from the PDF text.
2. Match each to a results key using the rounding rules (`results/index.json` stores the display format).
3. Flag unmatched numbers, rounding up, CI omissions, and wording that implies risk or causality.

## 10. Verification (end to end)
- `make all` on a clean checkout runs `data → rref → parity → analysis → web → paper → audit`.
- `pytest`, `npm test`, `npx playwright test`.
- `tools/check_page_count.py paper/build/paper.pdf` reports ≤ 7.
- `tools/check_bundle_size.mjs` passes.
- `tools/audit_numbers.py` reports 0 unmatched.
- `hash_outputs` is identical across two runs.
- The site is previewed locally with `npm run preview` in the in-app browser or Playwright on every route, mode and width.
- CI (`ci.yml`) runs everything except the R re-runs and the deploy. It compares committed `parity/r_outputs` against Python outputs, so parity is re-checked on every push.

## 11. Tool notes (the only tool-specific part)
- **Claude Code:**
  - Subagents via the Agent tool (`subagent_type` Explore for inventory, general-purpose for porting and review).
  - Skills: `dataviz`, `pdf`, `run`, `code-review`, `security-review`, `simplify`.
  - In-app browser for previews; `CLAUDE.md` imports `AGENTS.md`.
- **Codex:** run the same subagent briefs as separate tasks or threads. Skills map to the same manual steps; for example, `pdf` becomes `pypdf` page count plus `pdftotext`. It reads `AGENTS.md`.

## 12. Risks and mitigations
| Risk | Mitigation |
|---|---|
| Python 3.14 lacks wheels for statsmodels or xgboost | Try in P1. Fallback: Python 3.12, which needs a Homebrew install outside the folder, so **ask the user first** |
| xgboost 1.7 fails to compile into `.r-lib` (OpenMP on macOS) | Native-API replication of caret's default grid (§4), logged as a deviation |
| sklearn CART/RF/GBM differ from rpart/randomForest/gbm beyond tolerance (sklearn has no factor-subset splits; impurity-based pruning) | Train on R's exported frames at R's chosen hyperparameters, with character-as-codes and caret's dummy design. If still outside, document per-model TP/FP deltas and ask the user to accept |
| The pruned tree's recall is tiny (0.08), so a slightly different cp collapses it to the root | Map R's chosen nsplit, not cp. Undefined precision is handled explicitly |
| JS libm differs from R in the last ulp at radius boundaries | The nearest known boundary is 3.2e-5 m, far above ~1e-9 m float error. Boundary cases are in fixtures |
| R's `calibrate()` is unseeded | Seeded twin run; looser tolerance documented |
| The composition shift (auto-theft surge) drives part of the post-2019 odds ratio | Report per-category ORs (§5.1 item 8) and state it in the paper and on Explain |
| CI runs `make data` but the Robbery repo is private, or the pinned SHA disappears | CI checks only committed outputs (no raw data needed). `make data` falls back to `_reference/` locally |
| Prior shift in the temporal holdout | Report prevalence and PR-AUC lift over baseline; threshold tuned in train years |
| PMTiles range requests on GitHub Pages | Test in P6; fallback OpenFreeMap |
| 7-page cap | Budget in §8; CI page-count check; cut order defined |
| Data and code licensing (Explorer LICENSE grants nothing; team of 6) | Q2/Q3 before release; port without copying R code verbatim |
| GitHub Pages on a private repo needs a paid plan | Q1 |
| Influence diagnostics on 175K rows (memory/time) | Compute hat-diagonal-based measures only; pre-render plots |
| Disk (22 GB free) | Budget about 3 GB (`.venv`, `.r-lib`, Playwright, PMTiles source, caches) |
| Scope creep in P6 | Pages ship in order Explore → Predict → Explain → Overview → Methods → Paper → About; design review after each |

## 13. Open questions for the user (defaults used until answered)
1. **Remote:** `toronto-crime-analytics` returns 404 publicly. Is it private? Free GitHub Pages needs a public repo (or GitHub Pro). gh isn't installed, so pushes use git over HTTPS with your credentials. *Default: plan for public at release; nothing is pushed without asking.*
2. **STA313 team:** may the site and paper credit teammates by name, and do they consent to the logic being ported and published? The Explorer LICENSE grants no rights. *Default: credit "STA313 project team (6 students), led by Kaiwen Yang", no names; reimplement rather than copy code.*
3. **Licence:** MIT for this repo's code? Data stays under the TPS and City of Toronto terms. *Default: MIT, plus a DATA_LICENSE.md verified in P1.*
4. **JSC370 Fig 1 (3D scatter):** neither Vega-Lite nor any print-friendly library does 3D. The z-axis repeated the colour channel (robbery count), so a 2D scatter with colour and size carries the same information. Is this one chart-type exception acceptable? *Default: yes, logged in PARITY.md.*
5. **Installs (blocks P1):** R packages (CRAN, including xgboost 1.7 from the archive), PyPI packages, npm packages, Playwright Chromium and a Protomaps extract all download into this folder only. OK? *Asked at the start of P1; no default.*
8. **Outside-folder fallbacks:** if the xgboost 1.7 build needs Homebrew `libomp`, or Python 3.14 lacks a needed wheel (so 3.12 is needed), may those be installed outside the folder? *Asked when the case arises; the in-folder fallback (§4) is tried first.*
6. **Author line and metadata:** "Kaiwen (Kevin) Yang"? STA303 term/year? *Default: "Kaiwen Yang"; term omitted until confirmed.*
7. **Old repos:** later, add pointer READMEs to the two original repos (outside this folder)? *Default: not done; listed in P9 for you.*

## 14. Files created on approval (first execution step)
- **`PLAN.md`**: this document.
- **`PROGRESS.md`**: a checklist mirroring the §5 phases and their tasks (`- [ ]`). Header fields: current phase, last sitting date, next action, blockers, open questions with answers, tool versions. Each sitting ends by updating it.
- **`AGENTS.md`** (canonical) holds:
  - the user's non-negotiable rules 1–5 verbatim (parity first; improve only after parity, logged in CHANGES.md; never invent or round up numbers, everything traces to RESULTS.md; design rules; ask before push, deploy or delete);
  - the folder-scope rule (never modify anything outside this folder; `_reference/` is read-only; caches redirected);
  - the task definition (§2);
  - how-to-work rules: PROGRESS.md is the source of truth, read it first and update it last; subagent and reviewer roles; reviewers don't fix;
  - commands (`make …`), parity tolerances (pointer to PLAN §5), number-sourcing rules (`<Num>`, `\num{}`, no literal numerals), seeds and determinism.
- **`CLAUDE.md`**: `@AGENTS.md`, plus Claude Code specifics (subagent types, skills per phase, in-app browser for previews, `update_plan` usage).
- **`CHANGES.md`**: empty table (id, area, old, new, why, results key, date).
- **`RESULTS.md`**: header and format (key, file, producer, description, display format), filled from P3 onward.
