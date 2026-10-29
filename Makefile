SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
PYTHON ?= python3.12

.PHONY: python env data web versions

# Project-local Python 3.12 (uv in .cache/); use when python3.12 is not installed system-wide.
python:
	source tools/env.sh; bash tools/bootstrap_python.sh

env:
	source tools/env.sh; bash tools/bootstrap_env.sh "$(PYTHON)"

data:
	source tools/env.sh; .venv/bin/python tools/fetch_data.py

web:
	source tools/env.sh; cd web; npm run build

versions:
	source tools/env.sh; .venv/bin/python tools/tool_versions.py
