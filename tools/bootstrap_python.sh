#!/usr/bin/env bash
# Provide python3.12 inside the project (no system install): a small bootstrap venv holds uv,
# and uv downloads a standalone CPython 3.12 into .cache/python-install.
# Run after `source tools/env.sh`; then `make env` finds python3.12 on PATH (.cache/tools/bin).
set -euo pipefail
if [[ -x "$TCA_ROOT/.cache/tools/bin/python3.12" ]]; then
  "$TCA_ROOT/.cache/tools/bin/python3.12" --version; exit 0
fi
python3 -m venv "$TCA_ROOT/.cache/bootstrap-venv"
"$TCA_ROOT/.cache/bootstrap-venv/bin/python" -m pip install --quiet uv
export UV_PYTHON_INSTALL_DIR="$TCA_ROOT/.cache/python-install" UV_CACHE_DIR="$TCA_ROOT/.cache/uv"
"$TCA_ROOT/.cache/bootstrap-venv/bin/uv" python install 3.12
py="$("$TCA_ROOT/.cache/bootstrap-venv/bin/uv" python find 3.12)"
ln -sf "$py" "$TCA_ROOT/.cache/tools/bin/python3.12"
"$TCA_ROOT/.cache/tools/bin/python3.12" --version
