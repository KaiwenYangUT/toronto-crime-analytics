# Rebuild cv.glmnet's fold assignment for the STA303 LASSO so the Python port can use the same folds.
# cv.glmnet draws foldid <- sample(rep(seq(nfolds), length = N)) right after set.seed(123); the
# claim is checked by refitting with that foldid and matching the exported cvm / lambda.min.
Sys.setenv(TZ = "America/Toronto")
suppressPackageStartupMessages(library(glmnet))
root <- normalizePath(Sys.getenv("TCA_ROOT", getwd()))
exp <- file.path(root, "build", "r-work", "sta303", "export_run1")
out <- file.path(root, "parity", "r_outputs", "sta303")
fr <- read.csv(gzfile(file.path(exp, "model_frame.csv.gz")), stringsAsFactors = FALSE)
fr$Covid_Outbreak <- factor(fr$Covid_Outbreak, levels = c("0", "1"))
x <- model.matrix(~ Presence_of_Sunset + Hour + Day_Of_Week_Numeric + Covid_Outbreak + Month + Season - 1, data = fr)
y <- fr$Robbery
n <- nrow(x)
set.seed(123)
foldid <- sample(rep(seq(10), length = n))
cv <- cv.glmnet(x, y, family = "binomial", alpha = 1, foldid = foldid)
ref <- read.csv(file.path(exp, "lasso_cv.csv"))
chk <- list(n = n, lambda_equal = isTRUE(all.equal(cv$lambda, ref$lambda, tolerance = 1e-12)),
            cvm_max_abs_diff = max(abs(cv$cvm - ref$cvm)), cvsd_max_abs_diff = max(abs(cv$cvsd - ref$cvsd)),
            lambda_min_equal = isTRUE(all.equal(cv$lambda.min, as.numeric(jsonlite::read_json(file.path(exp, "lasso_summary.json"))$lambda_min), tolerance = 1e-12)),
            fold_sizes = as.integer(table(foldid)), foldid_sha256 = digest::digest(paste(foldid, collapse = ","), algo = "sha256", serialize = FALSE))
stopifnot(chk$lambda_equal, chk$cvm_max_abs_diff < 1e-12, chk$lambda_min_equal)
dir.create(out, showWarnings = FALSE, recursive = TRUE)
jsonlite::write_json(chk, file.path(out, "foldid_check.json"), auto_unbox = TRUE, digits = NA, pretty = TRUE)
con <- gzfile(file.path(out, "foldid.csv.gz"), "w"); writeLines(as.character(foldid), con); close(con)
cat("foldid reconstruction verified against cv.glmnet: max |cvm diff| =", chk$cvm_max_abs_diff, "\n")
