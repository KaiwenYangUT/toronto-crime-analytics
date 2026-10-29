#!/usr/bin/env bash
# Explorer reference re-run on a writable copy. Run from the repo root:
#   source tools/env.sh; bash parity/r/run_explorer.sh
set -euo pipefail
export TZ=America/Toronto LC_ALL=en_CA.UTF-8
root="$(pwd -P)"
work="$root/build/r-work/explorer"
out="$root/parity/r_outputs/explorer"
mkdir -p "$out" "$root/build/r-work"
if [[ ! -d "$work" ]]; then
  cp -R "$root/_reference/explorer" "$work"
  chmod -R u+w "$work"
fi
cd "$work"

for run in 1 2; do
  Rscript --vanilla scripts/build_data.R "$root/data/raw" > "$out/build_data_run$run.log" 2>&1
  cp data/processed/crime.rds "$out/crime_run$run.rds"
  md5 -q data/processed/crime.rds > "$out/crime_run$run.md5"
done
cmp "$out/crime_run1.rds" "$out/crime_run2.rds" && echo "RDS rebuild byte-identical" | tee "$out/rds_rebuild.txt"

Rscript --vanilla tests/test_analysis.R > "$out/test_analysis.log" 2>&1
grep -c '^PASS:' "$out/test_analysis.log" | tee "$out/test_analysis_pass_count.txt"
Rscript --vanilla tests/test_shiny.R > "$out/test_shiny.log" 2>&1
cat "$out/test_shiny.log"
