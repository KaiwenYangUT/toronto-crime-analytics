# Toronto robbery vs other major property crime

Repository: <https://github.com/KaiwenYangUT/toronto-crime-analytics>

Given that a major property-type crime was reported in Toronto, **which type is it?** This repository answers that
question twice, from Toronto Police Service open data for 2014 to 2023:

- **Explain**: a binomial model of the odds that a reported incident is a robbery rather than an auto theft, break and
  enter or theft over, by hour, month, weekday, solar darkness and a post-2019 period, with neighbourhood-cluster-robust
  intervals, and a rotatable three-dimensional view of neighbourhood robbery counts against income and job ratio
  (loaded on demand, with a flat fallback).
- **Predict**: a five-rung ladder of models (time only, plus premises and place, plus census, random forest, XGBoost),
  evaluated on held-out neighbourhoods and on a held-out later period, with bootstrap intervals for every score and
  every rung-to-rung difference.
- **Explore**: a map and charts of reported incidents with filters, computed in the browser.
- **Paper**: a six-page write-up plus a references page, built from the same result files.

The quantity is P(robbery | reported incident). It is **not** the risk of being robbed at a place or time, and nothing
here is causal. The headline result: many time terms are statistically clear, yet time alone predicts little; premises and
location type, which partly define the crime types, supply most of the predictive lift.

| | |
|---|---|
| ![Overview](docs/screenshots/overview-1280-light-fold.png) | ![Explain](docs/screenshots/explain-1280-light-fold.png) |
| ![Predict](docs/screenshots/predict-1280-light-fold.png) | ![Explore](docs/screenshots/explore-1280-light-fold.png) |

## Status

Built and verified locally; **not yet published**. The site has not been deployed and the workflows in
`.github/workflows/` have never run. See `PROGRESS.md` for the state of the work and its open items.

## How it is built

1. One validated Python pipeline (`pipeline/src/tca/`) builds a unified table, ports the three course analyses faithfully
   (checked against re-runs of the original R code, `parity/`), and then improves them (`CHANGES.md`).
2. Every number the site and paper show comes from a file in `results/` (registry: `RESULTS.md`). The site renders numbers
   only through `<Num k="results.key:path"/>`; the paper only through `\res{...}` macros and generated tables. A missing
   value or display format fails the build, and `tools/audit_numbers.py` checks the built site and PDF.
3. The site (`web/`) is static React + TypeScript (React Router 7, prerendered) with Vega-Lite charts and a MapLibre map.
   The paper (`paper/`) is LaTeX, compiled with tectonic, with figures drawn from the same chart specifications.
4. Design tokens live only in `design/tokens.json`; see `design/DESIGN.md`.

## Reproduce

Needs Python 3.12, Node 24 or newer, R only for the optional reference re-runs, and tectonic and poppler for the paper.
Everything installs inside the repository folder.

```bash
make env        # Python venv, node dependencies, Playwright Chromium (make python first if Python 3.12 is absent)
make data       # fetch the pinned input files and verify their checksums
make parity     # Python ports against the committed R outputs
make analysis   # result files (about 70 minutes, mostly the ablation ladder)
make paper      # numbers, tables, figures and the PDF (at most 7 content pages; references on their own page)
make web        # build the static site in web/site
make audit      # honesty audit of every numeral, bundle budgets, PDF checks
make check      # unit tests and lint
```

`make rref` re-runs the original R projects (hours); the committed `parity/r_outputs/` are used otherwise. The Toronto
basemap used by Explore (`web/public/basemap/toronto.pmtiles`, 20 MB, sha256 pinned) is committed; `tools/fetch_basemap.sh`
records how it was extracted from Protomaps and verifies its checksum.

Two runs on the same machine give identical result hashes (`results/CHECKSUMS.sha256`); `tools/fresh_checkout.sh`
verifies this in a fresh clone.

## Data and licences

- Code: MIT, see `LICENSE`.
- Data are not committed and are not covered by the code licence. Toronto Police Service open data are used under the Open
  Government Licence – Ontario; City of Toronto neighbourhood profiles under the Open Government Licence – Toronto. See
  `DATA_LICENSE.md` for terms, attribution and limits.
- Contains information licensed under the Open Government Licence – Ontario, and under the Open Government Licence –
  Toronto. This is an independent analysis, not endorsed by the Toronto Police Service or the City of Toronto.
- Basemap tiles are built from OpenStreetMap data (© OpenStreetMap contributors, ODbL) by Protomaps.

## Repository map

`pipeline/` Python package and tests · `parity/` R reference re-runs, outputs and comparison scripts · `results/` the only
source of published numbers · `web/` the site · `paper/` the paper · `design/` tokens and design system · `tools/` build,
audit and check scripts · `reviews/` review reports (honesty, design, security) · `PLAN.md`, `AGENTS.md`, `PROGRESS.md`
the plan, working rules and state.
