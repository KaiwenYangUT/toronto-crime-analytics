#!/usr/bin/env bash
# STA303 reference re-run: knit the hooked copy twice, require identical exports.
#   source tools/env.sh; bash parity/r/run_sta303.sh
set -euo pipefail
export TZ=America/Toronto LC_ALL=en_CA.UTF-8
root="$(pwd -P)"
export TCA_ROOT="$root" CRIME_DATA_DIR="$root/data/raw"
Rscript --vanilla parity/r/make_sta303_copy.R
work="$root/build/r-work/sta303"
for run in 1 2; do
  export STA303_OUT="$work/export_run$run"
  rm -rf "$STA303_OUT"
  Rscript --vanilla -e "rmarkdown::render('$work/STA303_Final_Report.Rmd', output_file = 'report_run$run.html', output_dir = '$work', intermediates_dir = '$work/tmp$run', knit_root_dir = '$work', quiet = TRUE)"
done
(cd "$work/export_run1" && find . -type f | sort | xargs md5 -r) > "$work/export_run1.md5"
(cd "$work/export_run2" && find . -type f | sort | xargs md5 -r) > "$work/export_run2.md5"
if diff -q "$work/export_run1.md5" "$work/export_run2.md5"; then echo "STA303 exports identical across two knits"; else echo "STA303 exports DIFFER"; diff "$work/export_run1.md5" "$work/export_run2.md5" || true; fi
md5 -r "$work/report_run1.html" "$work/report_run2.html"
