#!/usr/bin/env bash
# JSC370 reference re-run.
#   source tools/env.sh; bash parity/r/run_jsc370.sh collation   # quick: stop after the split, both collations
#   source tools/env.sh; bash parity/r/run_jsc370.sh full <en_CA|C> # full knit incl. 6 models (long)
set -euo pipefail
root="$(pwd -P)"
export TCA_ROOT="$root" TZ=America/Toronto
Rscript --vanilla parity/r/make_jsc370_copy.R
work="$root/build/r-work/jsc370"
env_for() {  # $1 = en_CA | C
  if [[ "$1" == "C" ]]; then echo "LC_CTYPE=en_CA.UTF-8 LC_COLLATE=C"; else echo "LC_ALL=en_CA.UTF-8"; fi
}
knit() {  # $1 = tag, $2 = locale tag, $3 = stop-after-split flag
  local out="$work/export_$1"
  rm -rf "$out"
  env -u LC_ALL $(env_for "$2") JSC370_OUT="$out" ${3:+JSC370_STOP_AFTER_SPLIT=1} \
    Rscript --vanilla -e "rmarkdown::render('$work/Final_Project.Rmd', output_file = 'report_$1.html', output_dir = '$work', intermediates_dir = '$work/tmp_$1', knit_root_dir = '$work', quiet = TRUE)"
}
case "${1:-}" in
  collation)
    knit collation_en_CA en_CA stop
    knit collation_C C stop
    for t in collation_en_CA collation_C; do echo "== $t"; cat "$work/export_$t/split_summary.json" | tr -d '\n '; echo; done ;;
  full) knit "full_$2" "$2" "" ;;
  *) echo "usage: $0 collation | full <en_CA|C>"; exit 2 ;;
esac
