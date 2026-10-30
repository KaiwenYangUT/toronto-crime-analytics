# RESULTS

The registry of every output file whose numbers may appear on the site or in the paper (AGENTS.md rule 3).
- `results/index.json` is the machine-readable version. This file is generated from it by `tools/gen_results_md.py`.
- A number that isn't traceable to a key below must not be published.

Each results file carries a provenance header: `{key, producer, git_sha, inputs: {file: sha256}, seed, created}`.
Identity hashes (ignoring `created` and `git_sha`) are in `results/CHECKSUMS.sha256`.

| key | file | producer | description | display formats |
|---|---|---|---|---|
| `explain.sta303_v2` | `results/explain/explain.sta303_v2.json` | `tca.explain.sta303_v2` | Inference model: odds of robbery vs other major property crime by hour, month, weekday, solar darkness and the post-2019 period, with cluster-robust intervals, CV AUC and composition check | `cv.auc_mean`: {'decimals': 3}, `cv.auc_sd`: {'decimals': 3}, `dark.or`: {'decimals': 2}, `post2019.or`: {'decimals': 2}, `post2019.or_hi`: {'decimals': 2}, `post2019.or_lo`: {'decimals': 2}, `post2019.robust_or_hi`: {'decimals': 2}, `post2019.robust_or_lo`: {'decimals': 2}, `robbery_share`: {'decimals': 1, 'percent': True} |
