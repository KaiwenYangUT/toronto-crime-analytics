# Build the patched STA303 work copy: the reference Rmd plus export-hook chunks.
# Each hook is inserted after the closing fence of the chunk whose last code line
# matches `anchor` (checked, so a changed source fails loudly). Original lines
# are never modified. Run from the repo root.
root <- normalizePath(Sys.getenv("TCA_ROOT", getwd()))
src <- file.path(root, "_reference", "STA303_Final_Report.Rmd")
dst_dir <- file.path(root, "build", "r-work", "sta303")
dir.create(dst_dir, showWarnings = FALSE, recursive = TRUE)
lines <- readLines(src, warn = FALSE)

hook <- function(id, code) c("", sprintf("```{r export-%s, echo=FALSE, message=FALSE, warning=FALSE}", id), code, "```", "")
hooks <- list(
  list(anchor = "crime$Robbery <- ifelse(crime$Robbery == \"FALSE\", 0, 1)", id = "frame", code = c(
    "source(file.path(Sys.getenv('TCA_ROOT'), 'parity/r/hooks/sta303_hooks.R'))",
    "fr <- crime; fr$Occurrence_Time <- format(fr$Occurrence_Time, '%Y-%m-%d %H:%M:%S', tz = Sys.timezone())",
    "fr$Covid_Outbreak <- as.character(fr$Covid_Outbreak); fr$row_in_frame <- seq_len(nrow(fr))",
    "wcsv(fr, 'model_frame', gz = TRUE)",
    "wjson(list(n = nrow(crime), robbery = sum(crime$Robbery == 1), other = sum(crime$Robbery == 0),",
    "  by_category = as.list(table(crime$Crime_Category)), tz = Sys.timezone(), locale = Sys.getlocale(),",
    "  covid_levels = levels(crime$Covid_Outbreak)), 'frame_summary')")),
  list(anchor = "summary(model)", id = "full-glm", code = c(
    "glm_dump(model, 'glm_full')",
    "wjson(list(contrasts = lapply(model$contrasts, as.character), xlevels = model$xlevels,",
    "  matrix_cols = colnames(model.matrix(model))), 'glm_full_design')")),
  list(anchor = "kable(vif_dataframe, caption = \"Table of Variance Inflation Factors\", col.names = c(\"GVIF\", \"Df\", \"GVIF^(1/(2*Df))\"))", id = "vif", code = c(
    "wcsv(cbind(term = rownames(vif_values), as.data.frame(unclass(vif_values))), 'vif')")),
  list(anchor = "select_var_bic", id = "stepwise", code = c(
    "wjson(list(aic_terms = select_var_aic, bic_terms = select_var_bic, aic_k = 2, bic_k = log(nrow(crime))), 'stepwise_selected')",
    "wcsv(cbind(step = rownames(sel.var.aic$anova), as.data.frame(sel.var.aic$anova)), 'stepwise_aic_path')",
    "wcsv(cbind(step = rownames(sel.var.bic$anova), as.data.frame(sel.var.bic$anova)), 'stepwise_bic_path')")),
  list(anchor = "print(coef(lasso_final))", id = "lasso", code = c(
    "cm <- as.matrix(coef(lasso_final))",
    "wcsv(data.frame(term = rownames(cm), coef = cm[, 1]), 'lasso_coef')",
    "wcsv(data.frame(lambda = cv_out$lambda, cvm = cv_out$cvm, cvsd = cv_out$cvsd, cvup = cv_out$cvup,",
    "  cvlo = cv_out$cvlo, nzero = cv_out$nzero), 'lasso_cv')",
    "wjson(list(lambda_min = cv_out$lambda.min, lambda_1se = cv_out$lambda.1se, x_dim = dim(x),",
    "  x_cols = colnames(x), glmnet_version = as.character(packageVersion('glmnet')),",
    "  lasso_final_lambda = best_lambda, df = lasso_final$df, dev_ratio = lasso_final$dev.ratio), 'lasso_summary')")),
  list(anchor = "lrtest(logit.bic, logit.aic)", id = "lrt", code = c(
    "lr <- lrtest(logit.bic, logit.aic)",
    "wcsv(cbind(model = rownames(lr), as.data.frame(unclass(lr))), 'lrt')",
    "glm_dump(logit.bic, 'glm_bic'); glm_dump(logit.aic, 'glm_aic')")),
  list(anchor = "  qqline(model$residuals, col = \"#B7784C\", lwd = 1.5, lty = 2)", id = "influence", code = c(
    "glm_dump(model, 'glm_final')",
    "wjson(list(dfbetas = wf32(dfbetas, 'dfbetas'), dffits = wf32(dffits, 'dffits'), cooks = wf32(cooksd, 'cooks'),",
    "  resid = wf32(model$residuals, 'working_resid'), dfbetas_cols = colnames(dfbetas)), 'influence_layout')",
    "top <- function(v, k = 20) { o <- order(abs(v), decreasing = TRUE)[1:k]; data.frame(index = o, value = v[o]) }",
    "wcsv(top(cooksd), 'top20_cooks'); wcsv(top(dffits), 'top20_dffits')",
    "for (j in seq_len(ncol(dfbetas))) wcsv(top(dfbetas[, j]), sprintf('top20_dfbetas_%d', j))",
    "wjson(list(cooks_max = max(cooksd), dffits_range = range(dffits), dfbetas_range = apply(dfbetas, 2, range)), 'influence_summary')",
    "qq <- qqnorm(model$residuals, plot.it = FALSE)",
    "wjson(list(n = length(qq$x), x_range = range(qq$x), y_range = range(qq$y)), 'qq_summary')")),
  list(anchor = "model <- lrm(Robbery ~ Presence_of_Sunset + Hour + Day_Of_Week_Numeric + Covid_Outbreak + Month + Season, data = crime, x =TRUE, y = TRUE, model= T)", id = "lrm", code = c(
    "wcsv(data.frame(term = names(coef(model)), coef = unname(coef(model))), 'lrm_coef')",
    "wcsv(data.frame(stat = names(model$stats), value = unname(model$stats)), 'lrm_stats')",
    "wcsv(cbind(term = rownames(vcov(model)), as.data.frame(vcov(model))), 'lrm_vcov')",
    "wjson(list(rms_version = as.character(packageVersion('rms'))), 'lrm_meta')")),
  list(anchor = "     ylab = \"Observed Proportion of Events\")", id = "calibration", code = c(
    "cal <- unclass(cross.calib)",
    "wcsv(as.data.frame(matrix(as.numeric(cal), nrow = nrow(cal), dimnames = dimnames(cal))), 'calibration_matrix')",
    "wtext(capture.output(print(cross.calib)), 'calibration_printed')",
    "pr <- attr(cross.calib, 'predicted'); cm <- unclass(cross.calib)",
    "err <- pr - approx(cm[, 'predy'], cm[, 'calibrated.corrected'], xout = pr, ties = mean)$y",
    "wjson(list(n = length(pr), mean_abs_error = mean(abs(err)), mean_squared_error = mean(err^2), q90_abs_error = unname(quantile(abs(err), 0.9))), 'calibration_errors')",
    "wjson(list(method = 'crossvalidation', B = 10, dim = dim(cal), seed_note = 'set.seed(123) at the LASSO chunk is the last RNG use before calibrate()'), 'calibration_meta')")),
  list(anchor = "text(0.7, 0.4, label = paste(\"AUC = \", round(auc(roc_logit), 2)))", id = "roc", code = c(
    "wjson(list(levels = roc_logit$levels, direction = roc_logit$direction, auc = as.numeric(auc(roc_logit)),",
    "  n_thresholds = length(roc_logit$thresholds), pROC_version = as.character(packageVersion('pROC'))), 'roc_summary')",
    "wcsv(data.frame(threshold = roc_logit$thresholds, sensitivity = roc_logit$sensitivities, specificity = roc_logit$specificities), 'roc_curve')",
    "wcsv(as.data.frame(table(round(p, 12))), 'fitted_value_table')")),
  list(anchor = "      col.names = c(\"Coeff.\", \"StdE.\", \"T.val\", \"P-val.\"))", id = "gaussian", code = c(
    "glm_dump(model, 'glm_gaussian')",
    "wcsv(cbind(term = rownames(model_summary_df), model_summary_df), 'gaussian_table')"))
)

for (h in hooks) {
  hit <- which(trimws(lines, "right") == trimws(h$anchor, "right"))
  if (length(hit) != 1L) stop("Anchor for ", h$id, " matched ", length(hit), " lines")
  fence <- hit + which(startsWith(lines[hit:length(lines)], "```"))[1] - 1L
  lines <- append(lines, hook(h$id, h$code), after = fence)
}
writeLines(lines, file.path(dst_dir, "STA303_Final_Report.Rmd"))
cat("wrote", length(hooks), "hooks\n")
