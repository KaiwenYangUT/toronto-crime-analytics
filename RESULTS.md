# RESULTS

The registry of every output file whose numbers may appear on the site or in the paper (AGENTS.md rule 3).
- `results/index.json` is the machine-readable version. This file is generated from it by `tools/gen_results_md.py`.
- A number that isn't traceable to a key below must not be published.

Each results file carries a provenance header: `{key, producer, git_sha, inputs: {file: sha256}, seed, created}`.
Identity hashes (ignoring `created` and `git_sha`) are in `results/CHECKSUMS.sha256`.

| key | file | producer | description | display formats |
|---|---|---|---|---|
| `explain.sta303_v2` | `results/explain/explain.sta303_v2.json` | `tca.explain.sta303_v2` | Inference model: odds of robbery vs other major property crime by hour, month, weekday, solar darkness and the post-2019 period, with cluster-robust intervals, CV AUC and composition check | `cv.auc_mean`: {'decimals': 3}, `cv.auc_sd`: {'decimals': 3}, `dark.or`: {'decimals': 2}, `post2019.or`: {'decimals': 2}, `post2019.or_hi`: {'decimals': 2}, `post2019.or_lo`: {'decimals': 2}, `post2019.robust_or_hi`: {'decimals': 2}, `post2019.robust_or_lo`: {'decimals': 2}, `robbery_share`: {'decimals': 1, 'percent': True} |
| `predict.ablation` | `results/predict/predict.ablation.json` | `tca.predict.ablation_report` | Ablation ladder L0-L5 (+ no-premises) under neighbourhood-grouped CV and a temporal holdout: ROC-AUC, PR-AUC, F1 with cluster-bootstrap intervals and paired rung differences | `designs.*.prevalence`: {'decimals': 1, 'percent': True}, `designs.*.variants.*.f1.estimate`: {'decimals': 3}, `designs.*.variants.*.pr_auc.estimate`: {'decimals': 3}, `designs.*.variants.*.roc_auc.estimate`: {'decimals': 3} |
| `predict.eda_corrections` | `results/predict/predict.eda_corrections.json` | `tca.predict.eda_corrections` | Evidence behind corrected JSC370 chart captions (summer, weekend, darkness, hourly) and neighbourhood-level Figure 2 statistics | `claims.darkness.dark_share`: {'decimals': 1, 'percent': True}, `claims.summer_rise.winter_share`: {'decimals': 1, 'percent': True} |
| `predict.inference_vs_prediction` | `results/predict/predict.inference_vs_prediction.json` | `tca.predict.inference_vs_prediction` | Side-by-side: statistically clear time terms vs the predictive lift of time, location/premises and census blocks | `post2019_or`: {'decimals': 2}, `sta303_v2_cv_auc`: {'decimals': 3} |
| `predict.xgb_grid_fix` | `results/predict/predict.xgb_grid_fix.json` | `parity/compare/xgb_grid_fix.py` | JSC370 XGBoost: caret default grid (as run) vs the original's intended tune_grid, on the original 2020 train/test split; 10-seed means | `as_intended.test.f1_mean`: {'decimals': 3}, `as_run_caret_default.test.f1_mean`: {'decimals': 3} |
