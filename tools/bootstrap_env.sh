#!/usr/bin/env bash
set -euo pipefail

python_command="${1:-python3.12}"
if [[ ! -x .venv/bin/python ]]; then
  "$python_command" -m venv .venv
fi
if [[ -f requirements.lock ]]; then
  .venv/bin/python -m pip install -r requirements.lock
else
  .venv/bin/python -m pip install -r requirements.in
  .venv/bin/python -m pip freeze > requirements.lock
fi
if [[ ! -f web/package.json ]]; then
  npm create vite@latest web -- --template react-ts --no-interactive
fi
if [[ -f web/package-lock.json ]]; then
  (cd web && npm ci)
else
  (cd web && npm install)
fi
if [[ -f web/node_modules/.bin/playwright ]]; then
  (cd web && npx --no-install playwright install chromium)
fi
.venv/bin/python -c 'import statsmodels, sklearn, xgboost; print("Analysis imports OK")'
