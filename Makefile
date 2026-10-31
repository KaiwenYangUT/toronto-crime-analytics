SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
PYTHON ?= python3.12

.PHONY: python env data web paper versions

# Project-local Python 3.12 (uv in .cache/); use when python3.12 is not installed system-wide.
python:
	source tools/env.sh; bash tools/bootstrap_python.sh

env:
	source tools/env.sh; bash tools/bootstrap_env.sh "$(PYTHON)"

data:
	source tools/env.sh; .venv/bin/python tools/fetch_data.py

web:
	source tools/env.sh; cd web; npm run build

# Paper: numbers, tables and figures from results/, then LaTeX (needs `make env`; fonts in .cache/fonts).
paper:
	source tools/env.sh; python tools/gen_web_data.py; python tools/gen_paper.py all
	source tools/env.sh; python tools/check_paper_numerals.py
	source tools/env.sh; cd paper; tectonic --outdir build --keep-logs paper.tex
	source tools/env.sh; python tools/check_paper_pdf.py paper/build/paper.pdf 7
	mkdir -p web/public/paper; cp paper/build/paper.pdf web/public/paper/paper.pdf

versions:
	source tools/env.sh; .venv/bin/python tools/tool_versions.py
