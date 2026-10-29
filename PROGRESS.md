# PROGRESS

The source of truth for resuming work. Follow `RESUME.md` §2 to resume and §3 to checkpoint.

| Field | Value |
|---|---|
| Current phase | P2 R reference re-runs (started) |
| In progress | P2 pinned R library and independent reference runner preparation \| started 2026-10-29 \| files: parity/r/, parity/r_outputs/, build/r-work/{explorer,sta303,jsc370}/, Makefile, PROGRESS.md \| machine: Kevins-iMac.local \| nothing from the earlier attempt survived on disk (parity/r empty, no build/), redone from scratch \| commands: source tools/env.sh; Rscript --vanilla parity/r/install_r_lib.R |
| Last sitting | 2026-10-29 (Claude Code on Kevins-iMac.local; resumed P2, machine check done) |
| Next action | Install/check pinned project-local R library; prepare 3 independent rerun copies and export hooks, then run cached reference jobs per PLAN.md P2 |
| Blockers | None for P2. Q2 blocks P4c; Q1 blocks P9. Outside-folder installations beyond the approved R/tectonic setup still require approval. |

## Machine log
Add a row whenever work moves to a different machine or app.

| Date | Hostname | App | Phases worked | Produced `results/`? |
|---|---|---|---|---|
| 2026-10-29 | (planning laptop) | Claude Code desktop | P0 | no |
| 2026-10-29 | Kevins-MacBook-Pro-128.local | Codex desktop | P1 complete; P2 started, no files kept | no |
| 2026-10-29 | Kevins-iMac.local | Claude Code desktop | P2 R reference re-runs | no |

### Initial resume preflight (historical; resolved during P1)
- `git status` and `git log --oneline -15` both report that this folder is not a Git repository. There was no interrupted item or existing Git history to reconcile; Git initialization was still pending at that point.
- Machine prerequisites checked: R 4.3.2 (below required 4.5), Python 3.14.6 (Python 3.12 also available), Node 24.13.0, Git present. `tectonic` is not found by `type -a` or at the standard Homebrew paths; invocation failed.
- `.venv`, `.r-lib`, `.cache`, and `web/` are absent; `_reference/` exists. No downloads or installs attempted because Q5 has no default and remains unanswered.
- Preflight was included in the first P1 commit after Q5 approval and local Git initialization (`de5cbb6`).

### Machine check, Kevins-iMac.local (2026-10-29)
- R 4.5.3 (the MacBook had 4.6.2; P2 produced nothing there, so the reference is run here), Node 25.6.1, npm 11.9, tectonic and Git 2.50.1 present. Python 3.12 absent. `.venv`, `.cache`, `build/`, `web/node_modules` absent; `.r-lib` empty. `data/raw/` holds 5 files; `make data` not yet run here. libomp present under /opt/homebrew. Google Chrome.app present (for shinytest2/chromote).

## Decisions (answered by the user)
- 2026-10-29: User separately approved installing/upgrading R ≥4.5 and tectonic outside the project if a project-local setup is unavailable. This does not authorize other outside-folder installations (for example libomp).
- 2026-10-29: Q5 approved: R/PyPI/npm packages, Playwright Chromium and a Protomaps extract may download/install inside this project only. No approval for push, deployment or deletion; R/tectonic system installation was authorized separately.
- 2026-10-29: the JSC370 reference is `feat/eda-visual-refresh` @ 4af4309. The stale root `visual.html` is ignored.
- 2026-10-29: the JSC370 parity reference is a fresh R re-run in a pinned environment, with tier-based ranking. Published numbers are recorded alongside.
- 2026-10-29: original captions the data contradicts are kept in the port and flagged in PARITY.md, then corrected in P5 and logged in CHANGES.md.
- 2026-10-29: Explore gets exact parity on its 3 categories first, then adds auto theft and B&E.

## Open questions (PLAN.md §13)
- [ ] Q1 Remote repo visibility (404 publicly) and Pages plan
- [ ] Q2 STA313 team credit and consent to port
- [ ] Q3 Licence (MIT default)
- [ ] Q4 JSC370 Fig 1: 3D scatter becomes a 2D scatter with colour and size
- [x] Q5 Project-local installs approved 2026-10-29 (R/tectonic system setup separately approved; other system installations need approval)
- [ ] Q6 Author line; STA303 term and year
- [ ] Q7 Pointer READMEs in the old repos (outside this folder)
- [ ] Q8 Outside-folder fallbacks: Python 3.12 is missing on Kevins-iMac.local (only 3.14.3), so `.venv` (locked on 3.12) cannot be built here; blocks `make env`/`make data`/P3, not P2. libomp is already present, no install needed

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
- [ ] `parity/r/install_r_lib.R` (shiny, testthat, shinytest2, xgboost 1.7.8.1) + `sessionInfo` saved
- [ ] `PATCHES.md` (local paths, no `download.file`, export hooks only)
- [ ] Explorer: 28/28 tests, shinytest, byte-identical RDS rebuild, `fixtures.json`
- [ ] STA303: knit twice (identical), n = 174,976, foldid reconstruction, exports
- [ ] JSC370: knit with xgboost; collation experiment; train/test frames + predictions + hyperparameters exported
- [ ] PARITY.md: published vs re-run table for JSC370

### P3 Shared Python pipeline
- [ ] `io`, `schema`, `definitions`, `features`
- [ ] `explore_legacy` == `crime.rds` (exact, float64 bit-equal)
- [ ] `sta303_legacy` == R model frame (exact)
- [ ] `jsc370_legacy` == R `final_data` (multiset exact)
- [ ] `unified` table + cross-category duplicate count + rule
- [ ] pytest green; code review

### P4 Faithful ports
- [ ] 4a Explain port: all items in PLAN.md §5 P4 within tolerance
- [ ] 4b Predict port: GLM confusion matrix exact; others within tolerance; tier partition identical
- [ ] 4c Explore engine (TS) + legacy bundle; 100% of fixtures exact (needs Q2)
- [ ] 4d Design tokens + Vega theme + palette validation report
- [ ] Chart checklist (`compare_charts.py`) green; mismatched messages flagged
- [ ] PARITY.md all green or deviations accepted → commit + local tag `parity-pass`

### P5 Improvements
- [ ] STA303 v2 (items 1–9 in PLAN.md §5.1)
- [ ] Compute-budget measurement on a 10% sample
- [ ] Ablation ladder L0–L5 + no-premises, grouped CV + temporal holdout, CIs, leakage tests
- [ ] XGBoost grid fix, seeds, caption corrections
- [ ] Inference vs prediction comparison
- [ ] CHANGES.md complete; RESULTS.md complete; hashes identical across two runs

### P6 Website
- [ ] Shell, design-system components, theme toggle
- [ ] Pages: Explore → Predict → Explain → Overview → Methods → Paper → About
- [ ] Explore v2 categories, URL state, parity suite in CI
- [ ] Budgets, axe, Lighthouse, 10-second test; design review after each page

### P7 Paper
- [ ] `\res{}` macros, generated tables, Vega-Lite PDF figures
- [ ] ≤ 7 pages (draft ≤ 6.3), fonts embedded, no literal numerals

### P8 Review loop
- [ ] Honesty audit: 0 unmatched
- [ ] Design review pass 2 resolved
- [ ] Code and security review
- [ ] Fresh-checkout `make all` in `build/fresh/` gives identical hashes

### P9 Release (ask before each step)
- [ ] README, LICENSE, DATA_LICENSE
- [ ] Ask → git push
- [ ] Ask → enable and deploy GitHub Pages
- [ ] List suggested old-repo pointer READMEs for the user

## Sitting log
| Date | Phase | Done | Next |
|---|---|---|---|
| 2026-10-29 | P0 | Inventoried all 3 originals (read-only); 4 decisions answered; plan stress-tested and revised; plan files written | Q5, then P1 |
| 2026-10-29 | Resume preflight | Read rules and resume state; checked Git, hostname and prerequisites; recorded fresh-machine blockers | Q5 approval and R/tectonic prerequisite decision, then P1 |
| 2026-10-29 | P1 | Q5 and R/tectonic approvals recorded; local Git/checkpoints; pinned read-only references; locked env and Chromium; verified raw inputs; publisher licences; 3 inventories; 4 spikes passed | P2 pinned R dependencies and cached reference reruns |

## P1 verification notes

- P1 checkpoint: Q5 recorded, local `main` initialized, `.editorconfig` added; initial commit includes the existing planning files and the resume preflight. No remote configured.

- P1 environment acceptance: `make env` completed twice, `pip check` reports no broken requirements, analysis imports pass, `npm run lint` and `npm run build` pass, Playwright Chromium downloaded. TypeScript 6.0 selected for typescript-eslint compatibility; no analysis or parity result generated. System installation: R/tectonic and their required dependencies; Homebrew cleanup disabled.
