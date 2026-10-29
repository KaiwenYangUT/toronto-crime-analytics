# Export helpers for the JSC370 reference re-run. Hook chunks only read existing objects
# and write files. Nothing here draws random numbers: bagging, RF and GBM in the
# original take their RNG state from earlier draws, so the stream must stay untouched.
out_dir <- Sys.getenv("JSC370_OUT")
stopifnot(nzchar(out_dir))
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

fmt17 <- function(v) ifelse(is.na(v), "NA", sprintf("%.17g", v))
wcsv <- function(df, name, gz = FALSE) {
  df[] <- lapply(df, function(col) if (is.double(col)) fmt17(col) else if (is.factor(col)) as.character(col) else col)
  path <- file.path(out_dir, if (gz) paste0(name, ".csv.gz") else paste0(name, ".csv"))
  con <- if (gz) gzfile(path, "w") else file(path, "w")
  utils::write.csv(df, con, row.names = FALSE, quote = TRUE)
  close(con)
}
wjson <- function(x, name) {
  jsonlite::write_json(x, file.path(out_dir, paste0(name, ".json")), auto_unbox = TRUE,
                       digits = NA, na = "string", pretty = TRUE, null = "null")
}
wtext <- function(lines, name) writeLines(lines, file.path(out_dir, paste0(name, ".txt")))
cm_df <- function(tab) {
  m <- as.matrix(unclass(tab))
  data.frame(actual = rownames(m), as.data.frame(m, check.names = FALSE), check.names = FALSE, row.names = NULL)
}
