#!/usr/bin/env bash
# Chart reference re-run: the JSC370 refreshed-branch widgets (scripts/build_visual_widgets.R) and
# variable.Rmd, run UNPATCHED on a work copy whose data/ is the pinned raw snapshot.
#   source tools/env.sh; bash parity/r/run_charts.sh
set -euo pipefail
export TZ=America/Toronto LC_ALL=en_CA.UTF-8
root="$(pwd -P)"
work="$root/build/r-work/charts"
rm -rf "$work"
mkdir -p "$work"
cp -R "$root/_reference/robbery/scripts" "$work/scripts"
cp "$root/_reference/robbery/variable.Rmd" "$root/_reference/robbery/index.Rmd" "$work/"
chmod -R u+w "$work"
ln -s "$root/data/raw" "$work/data"
cd "$work"
Rscript --vanilla -e 'source("scripts/build_visual_widgets.R"); build_visual_widgets("docs/widgets")' > "$work/widgets.log" 2>&1
Rscript --vanilla -e 'rmarkdown::render("variable.Rmd", output_dir = "docs", quiet = TRUE)' > "$work/variable.log" 2>&1
ls docs docs/widgets
