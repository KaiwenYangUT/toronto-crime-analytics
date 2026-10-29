SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c
PYTHON ?= python3.12

.PHONY: env data web versions

env:
	source tools/env.sh; bash tools/bootstrap_env.sh "$(PYTHON)"

data:
	source tools/env.sh; .venv/bin/python tools/fetch_data.py

web:
	source tools/env.sh; cd web; npm run build

versions:
	source tools/env.sh; .venv/bin/python tools/tool_versions.py
