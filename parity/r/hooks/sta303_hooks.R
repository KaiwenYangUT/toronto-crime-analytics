# Export helpers for the STA303 reference re-run. Hook chunks only read objects the
# original code already created and write files; they never alter modelling objects.
# None of the helpers draws random numbers.
out_dir <- Sys.getenv("STA303_OUT")
stopifnot(nzchar(out_dir))
dir.create(out_dir, showWarnings = FALSE, recursive = TRUE)

fmt17 <- function(v) ifelse(is.na(v), "NA", sprintf("%.17g", v))
wcsv <- function(df, name, gz = FALSE) {
  df[] <- lapply(df, function(col) if (is.double(col)) fmt17(col) else col)
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
# float32 arrays (little endian), gzip-compressed; rtol 1e-6 parity needs ~6e-8 only.
wf32 <- function(m, name) {
  m <- as.matrix(m)
  con <- gzfile(file.path(out_dir, paste0(name, ".f32.gz")), "wb")
  writeBin(as.numeric(t(m)), con, size = 4L, endian = "little")
  close(con)
  list(rows = nrow(m), cols = ncol(m), layout = "row-major float32 little-endian, gzip")
}
glm_dump <- function(fit, name) {
  s <- summary(fit)
  cf <- as.data.frame(s$coefficients)
  cf <- cbind(term = rownames(cf), cf)
  wcsv(cf, paste0(name, "_coef"))
  v <- vcov(fit)
  wcsv(cbind(term = rownames(v), as.data.frame(v)), paste0(name, "_vcov"))
  wjson(list(family = fit$family$family, link = fit$family$link, n = nobs(fit),
             df_residual = fit$df.residual, df_null = fit$df.null,
             deviance = fit$deviance, null_deviance = fit$null.deviance,
             aic = AIC(fit), bic = BIC(fit), loglik = as.numeric(logLik(fit)),
             iterations = fit$iter, converged = fit$converged,
             dispersion = s$dispersion, formula = deparse(formula(fit)),
             aliased = names(which(is.na(coef(fit))))), paste0(name, "_fit"))
}
