SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
PYTHON ?= python3.12

.PHONY: python env data rref parity analysis web paper audit check all versions

# Project-local Python 3.12 (uv in .cache/); use when python3.12 is not installed system-wide.
python:
	source tools/env.sh; bash tools/bootstrap_python.sh

env:
	source tools/env.sh; bash tools/bootstrap_env.sh "$(PYTHON)"

data:
	source tools/env.sh; .venv/bin/python tools/fetch_data.py

# R reference re-runs (hours; needs R and ./.r-lib). Outputs land in build/r-work; copy them into
# parity/r_outputs with parity/r/collect_exports.sh as in PROGRESS.md (P2). Committed outputs are used otherwise.
rref:
	source tools/env.sh; bash parity/r/run_sta303.sh; bash parity/r/run_jsc370.sh full en_CA; bash parity/r/run_explorer.sh; bash parity/r/run_charts.sh

# Python ports against the committed R outputs (fast).
parity:
	source tools/env.sh; export PYTHONPATH=pipeline/src; for s in compare_sta303 compare_sta303_model compare_jsc370 compare_jsc370_models compare_explore compare_charts unified_ledger; do python parity/compare/$$s.py; done

# Improvements and result files (about 70 minutes, mostly the ablation ladder), then hashes and RESULTS.md.
analysis:
	source tools/env.sh; export PYTHONPATH=pipeline/src; python -m tca.explain.sta303_v2; python -m tca.predict.ablation_run; python -m tca.predict.ablation_report; python -m tca.predict.eda_corrections; python -m tca.predict.inference_vs_prediction; python parity/compare/xgb_grid_fix.py; python parity/compare/jsc370_benchmark_results.py; python -m tca.explore.export; python tools/hash_outputs.py; python tools/gen_results_md.py

web:
	source tools/env.sh; python tools/gen_web_data.py; cd web; npm run build; npm run package

# Paper: numbers, tables and figures from results/, then LaTeX (needs `make env`; fonts in .cache/fonts).
paper:
	source tools/env.sh; python tools/spikes/fetch_assets.py; python tools/gen_web_data.py; python tools/gen_paper.py all
	source tools/env.sh; python tools/check_paper_numerals.py
	source tools/env.sh; cd paper; tectonic --outdir build --keep-logs paper.tex
	source tools/env.sh; python tools/check_paper_pdf.py paper/build/paper.pdf 7
	mkdir -p web/public/paper; cp paper/build/paper.pdf web/public/paper/paper.pdf

# Honesty audit, bundle budgets and paper checks (after `make web paper`).
audit:
	source tools/env.sh; python tools/audit_numbers.py; node tools/check_bundle_size.mjs; python tools/check_paper_pdf.py paper/build/paper.pdf 7

# Unit tests and lint.
check:
	source tools/env.sh; python -m pytest -q; python -m pytest tools/tests -q; ruff check .; cd web; npm test; npm run lint

all: data rref parity analysis web paper audit

versions:
	source tools/env.sh; .venv/bin/python tools/tool_versions.py
