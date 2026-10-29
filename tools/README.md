# Project-local tools

Run commands from the repository root. `make env` selects Python 3.12 by default
(`make env PYTHON=python3` overrides it), creates `.venv` and `.r-lib`, installs
`requirements.lock` and `web/package-lock.json`, and downloads Chromium into
`.cache/playwright`. Python package versions are pinned in the lock file;
Node's lock file also records package integrity hashes. R package pinning is P2.

Before an ad hoc tool or installation command, run `source tools/env.sh`. It
redirects Python, npm, Playwright, Tectonic, R, XDG, Homebrew and temporary caches
into `.cache/`. It does not install or upgrade system tools. Prerequisites are
Python ≥3.12, Node ≥20, R ≥4.5, Git, and tectonic. System installations require
separate user approval. `make versions` records the current machine in
`build/tool-versions.json`; summaries belong in `PROGRESS.md`.

The initial environment lock was resolved on macOS arm64, Python 3.12.2,
2026-10-29. Platform wheels may differ on other machines; committed integer/data
outputs must still match exactly and model parity uses the planned tolerances.
Do not regenerate model results merely because a machine changed.

The Vite React/TypeScript template is an untouched starter UI for P1, except for
tool configuration. TypeScript is pinned to the supported 6.0 series because
typescript-eslint currently rejects the template's TypeScript 7. The active
linter is ESLint; the template's unused Oxlint config and package remain to avoid
deleting supplied files without approval. `npm run test` is reserved for Vitest
tests as real pipeline/site behavior is introduced; the starter has none.

P1 logs are resumable evidence under `.cache/logs/`. `.cache-env-bootstrap.log`
contains the first bootstrap log, created before those directories existed.
Long analysis jobs in later phases must also cache per-fold/model outputs.
