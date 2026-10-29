# Build the patched JSC370 work copy of Final_Project.Rmd: two data patches (local CSV/xlsx
# instead of GitHub URLs, no download.file) plus export-hook chunks. Modelling code is untouched.
# Run from the repo root; a changed source fails loudly because every match is checked.
root <- normalizePath(Sys.getenv("TCA_ROOT", getwd()))
src <- file.path(root, "_reference", "robbery", "Final_Project.Rmd")
dst_dir <- file.path(root, "build", "r-work", "jsc370")
dir.create(dst_dir, showWarnings = FALSE, recursive = TRUE)
lines <- readLines(src, warn = FALSE)

# Patch 1: read the pinned local snapshot (data/raw is three levels up from the work dir).
prefix <- "https://raw.githubusercontent.com/KaiwenYangUT/Robbery_Crime_Classification/main/data/"
n_url <- sum(grepl(prefix, lines, fixed = TRUE))
stopifnot(n_url == 7L)
lines <- gsub(prefix, "../../../data/raw/", lines, fixed = TRUE)
# Patch 2: read the local workbook and skip the download that would overwrite it.
i <- which(lines == "local_file <- \"data/Income_Dataset.xlsx\"")
stopifnot(length(i) == 1L)
lines[i] <- "local_file <- \"../../../data/raw/Income_Dataset.xlsx\""
j <- which(lines == "download.file(github_url, local_file, mode = \"wb\")")
stopifnot(length(j) == 1L)
lines[j] <- "# download.file(github_url, local_file, mode = \"wb\")  # patched out: reads the pinned local copy"

hook <- function(id, code) c("", sprintf("```{r export-%s, echo=FALSE, message=FALSE, warning=FALSE}", id), code, "```", "")
hooks <- list(
  list(anchor = "nrow(test_data)", id = "split", code = c(
    "source(file.path(Sys.getenv('TCA_ROOT'), 'parity/r/hooks/jsc370_hooks.R'))",
    "fd <- final_data; fd$orig_row <- rownames(final_data); fd$in_train <- seq_len(nrow(final_data)) %in% train_index",
    "wcsv(fd, 'final_data', gz = TRUE)",
    "td <- train_data; td$orig_row <- rownames(train_data); wcsv(td, 'train_data', gz = TRUE)",
    "te <- test_data; te$orig_row <- rownames(test_data); wcsv(te, 'test_data', gz = TRUE)",
    "wcsv(data.frame(position = seq_along(train_index), final_data_row = train_index), 'train_index')",
    "wjson(list(n_final = nrow(final_data), n_train = nrow(train_data), n_test = nrow(test_data),",
    "  test_robbery = sum(as.character(test_data$Robbery) == 'TRUE'), train_robbery = sum(as.character(train_data$Robbery) == 'TRUE'),",
    "  collate = Sys.getlocale('LC_COLLATE'), locale = Sys.getlocale(), tz = Sys.timezone(), seed = 123,",
    "  robbery_levels = levels(train_data$Robbery)), 'split_summary')",
    "if (nzchar(Sys.getenv('JSC370_STOP_AFTER_SPLIT'))) knitr::knit_exit()")),
  list(anchor = "print(paste(\"F1-score:\", xgb_f1_score))", id = "models", code = c(
    "act <- as.character(test_data$Robbery)",
    "xgb_prob <- predict(optimal_xgb_model, test_data_xgb, type = 'prob')",
    "preds <- data.frame(orig_row = rownames(test_data), actual = act,",
    "  glm_prob = glm_test_predictions, glm_class = glm_test_predictions_binary,",
    "  tree_class = as.character(test_predictions_tree), bag_class = as.character(test_predictions_bag),",
    "  rf_class = as.character(test_predictions_rf), gbm_prob = boost_test_pred,",
    "  gbm_class = boost_test_pred_binary, xgb_class = as.character(xgb_test_pred), xgb_prob_1 = xgb_prob[['1']])",
    "wcsv(preds, 'test_predictions')",
    "wcsv(data.frame(orig_row = rownames(train_data), glm_prob = glm_train_predictions), 'glm_train_prob', gz = TRUE)",
    "cms <- list(glm_train = glm_conf_matrix_train, glm_test = test_glm_conf_matrix, tree_train = tree_conf_matrix_train,",
    "  tree_test = table(Actual = test_data$Robbery, Predicted = test_predictions_tree),",
    "  bag_train = train_conf_matrix_bag, bag_test = table(Actual = test_data_bag$Robbery, Predicted = test_predictions_bag),",
    "  rf_train = table(Actual = train_data_rf$Robbery, Predicted = train_predictions_rf),",
    "  rf_test = table(Actual = test_data_rf$Robbery, Predicted = test_predictions_rf),",
    "  gbm_train = table(Actual = train_data_boost$Robbery, Predicted = ifelse(boost_train_pred > 0.5, 1, 0)),",
    "  gbm_test = boost_conf_matrix, xgb_train = table(Actual = train_data_xgb$Robbery, Predicted = xgb_train_pred),",
    "  xgb_test = xgb_conf_matrix)",
    "wjson(lapply(cms, function(t) list(dimnames = lapply(dimnames(t), as.character), counts = as.integer(t))), 'confusion_matrices')",
    "gsum <- summary(glm_model)$coefficients",
    "wcsv(cbind(term = rownames(gsum), as.data.frame(gsum)), 'glm_coef')",
    "wjson(list(aliased = names(which(is.na(coef(glm_model)))), deviance = glm_model$deviance, aic = AIC(glm_model),",
    "  iterations = glm_model$iter, xlevels = glm_model$xlevels), 'glm_fit')",
    "wcsv(cbind(row = seq_len(nrow(robbery_tree$cptable)), as.data.frame(robbery_tree$cptable)), 'tree_cptable')",
    "wjson(list(optimalcp = optimalcp, nsplit_pruned = max(robbery_tree_prune$cptable[, 'nsplit']),",
    "  leaves_pruned = sum(robbery_tree_prune$frame$var == '<leaf>'),",
    "  rpart_version = as.character(packageVersion('rpart'))), 'tree_summary')",
    "ri <- function(m, nm) wcsv(data.frame(variable = rownames(importance(m)), importance(m)), nm)",
    "ri(robbery_bag, 'bag_importance'); ri(robbery_rf, 'rf_importance')",
    "wjson(list(bag = list(ntree = robbery_bag$ntree, mtry = robbery_bag$mtry, oob_err = tail(robbery_bag$err.rate[, 'OOB'], 1),",
    "    confusion = as.integer(robbery_bag$confusion[, 1:2])),",
    "  rf = list(ntree = robbery_rf$ntree, mtry = robbery_rf$mtry, oob_err = tail(robbery_rf$err.rate[, 'OOB'], 1),",
    "    confusion = as.integer(robbery_rf$confusion[, 1:2])),",
    "  randomForest_version = as.character(packageVersion('randomForest'))), 'forest_summary')",
    "gi <- summary(gbm_default, plotit = FALSE)",
    "wcsv(data.frame(variable = as.character(gi$var), rel_inf = gi$rel.inf), 'gbm_influence')",
    "wjson(list(n_trees = gbm_default$n.trees, interaction_depth = gbm_default$interaction.depth, shrinkage = gbm_default$shrinkage,",
    "  n_minobsinnode = gbm_default$n.minobsinnode, bag_fraction = gbm_default$bag.fraction,",
    "  train_fraction = gbm_default$train.fraction, distribution = gbm_default$distribution$name,",
    "  gbm_version = as.character(packageVersion('gbm'))), 'gbm_summary')",
    "wcsv(optimal_xgb_model$results, 'xgb_tune_results')",
    "wjson(list(best_tune = as.list(optimal_xgb_model$bestTune), n_grid = nrow(optimal_xgb_model$results),",
    "  tune_length = optimal_xgb_model$control$number, method = optimal_xgb_model$control$method,",
    "  xgboost_version = as.character(packageVersion('xgboost')), caret_version = as.character(packageVersion('caret')),",
    "  accuracy_best = max(optimal_xgb_model$results$Accuracy), unused_grid_rows = nrow(tune_grid)), 'xgb_summary')",
    "wcsv(optimal_xgb_model$resample, 'xgb_resample')")),
  list(anchor = "      caption = \"Performance Metrics of Different Models\")", id = "summary", code = c(
    "wcsv(summary_table, 'summary_table')",
    "wtext(capture.output(sessionInfo()), 'session_jsc370')"))
)
for (h in hooks) {
  hit <- which(trimws(lines, "right") == trimws(h$anchor, "right"))
  if (length(hit) != 1L) stop("Anchor for ", h$id, " matched ", length(hit), " lines")
  fence <- hit + which(startsWith(lines[hit:length(lines)], "```"))[1] - 1L
  lines <- append(lines, hook(h$id, h$code), after = fence)
}
writeLines(lines, file.path(dst_dir, "Final_Project.Rmd"))
cat("wrote JSC370 copy with", length(hooks), "hooks and 2 data patches\n")
