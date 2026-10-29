# Install the R packages the three reference re-runs need into ./.r-lib only.
# Run from the repository root after `source tools/env.sh`:
#   Rscript --vanilla parity/r/install_r_lib.R
# Re-running is safe: packages already at the pinned version are skipped.

root <- normalizePath(Sys.getenv("TCA_ROOT", getwd()))
lib <- file.path(root, ".r-lib")
stopifnot(identical(normalizePath(Sys.getenv("R_LIBS_USER")), normalizePath(lib)))
dir.create(lib, showWarnings = FALSE, recursive = TRUE)
.libPaths(c(lib, .libPaths()))
options(repos = c(CRAN = "https://cloud.r-project.org"), Ncpus = 4)

out_dir <- file.path(root, "parity", "r_outputs")
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

installed_version <- function(pkg) {
  p <- file.path(lib, pkg, "DESCRIPTION")
  if (file.exists(p)) read.dcf(p, "Version")[1, 1] else NA_character_
}

# Packages the originals load that are missing from the stock R library.
# shiny is pinned to the version in the Explorer's DEPENDENCIES.csv.
cran_pkgs <- c("testthat", "shinytest2", "chromote", "rms", "lmtest", "glmnet", "car")
pins <- c(shiny = "1.14.0")

archive_url <- function(pkg, ver) {
  sprintf("https://cloud.r-project.org/src/contrib/Archive/%s/%s_%s.tar.gz", pkg, pkg, ver)
}

for (pkg in names(pins)) {
  if (!identical(installed_version(pkg), pins[[pkg]])) {
    ok <- tryCatch({
      install.packages(pkg, lib = lib, quiet = FALSE)
      identical(installed_version(pkg), pins[[pkg]])
    }, error = function(e) FALSE)
    if (!ok) {
      install.packages(archive_url(pkg, pins[[pkg]]), repos = NULL, type = "source", lib = lib)
    }
  }
}

todo <- cran_pkgs[!vapply(cran_pkgs, function(p) !is.na(installed_version(p)), logical(1))]
if (length(todo)) install.packages(todo, lib = lib)

# xgboost 1.7.8.1 is the last release caret's xgbTree grid runs against (PLAN.md section 4).
if (!identical(installed_version("xgboost"), "1.7.8.1")) {
  install.packages(archive_url("xgboost", "1.7.8.1"), repos = NULL, type = "source", lib = lib)
}

wanted <- c(names(pins), cran_pkgs, "xgboost", "caret", "gbm", "rpart", "rpart.plot",
            "randomForest", "pROC", "dplyr", "tidyr", "readxl", "plotly", "leaflet",
            "ggplot2", "patchwork", "gridExtra", "kableExtra", "knitr", "rmarkdown",
            "RColorBrewer", "DT", "htmlwidgets")
for (pkg in wanted) suppressPackageStartupMessages(library(pkg, character.only = TRUE))
stopifnot(identical(as.character(packageVersion("xgboost")), "1.7.8.1"),
          identical(as.character(packageVersion("shiny")), pins[["shiny"]]))

ip <- installed.packages(lib.loc = .libPaths())
lock <- data.frame(
  package = wanted,
  version = ip[wanted, "Version"],
  library = ifelse(wanted %in% rownames(installed.packages(lib.loc = lib)), "project", "system"),
  row.names = NULL
)
write.csv(lock, file.path(root, "parity", "r", "r_packages.lock.csv"), row.names = FALSE, quote = FALSE)
writeLines(capture.output(sessionInfo()), file.path(out_dir, "session_install.txt"))
cat("R library ready:", nrow(lock), "packages recorded\n")
