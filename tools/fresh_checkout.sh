#!/usr/bin/env bash
# P8: clone the committed HEAD into build/fresh/ (own .venv, .cache, node_modules; nothing existing is touched),
# run the pipeline there and compare result hashes with this checkout.
#   bash tools/fresh_checkout.sh [steps...]     default: env data parity analysis web paper audit
# R re-runs (rref) are skipped: the committed parity/r_outputs are used (P2 verified them across two knits).
set -euo pipefail
root="$(pwd -P)"
fresh="$root/build/fresh"
steps=("$@"); [ ${#steps[@]} -gt 0 ] || steps=(env data parity analysis web paper audit)
if [ ! -d "$fresh/.git" ]; then
  mkdir -p "$root/build"
  git clone --quiet "$root" "$fresh"
else
  git -C "$fresh" pull --quiet --ff-only
fi
cd "$fresh"
echo "fresh checkout at $(git rev-parse --short HEAD) in $fresh"
for s in "${steps[@]}"; do
  echo "=== make $s ($(date +%H:%M:%S))"
  if [ "$s" = env ]; then make env PYTHON="$root/.cache/tools/bin/python3.12"; else make "$s"; fi
done
echo "=== compare result hashes"
git -C "$root" show HEAD:results/CHECKSUMS.sha256 | diff - "$fresh/results/CHECKSUMS.sha256" && echo "IDENTICAL result hashes (fresh vs committed)"
