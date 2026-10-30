"""Turn the cached ablation predictions into results/predict/predict.ablation.json.

PYTHONPATH=pipeline/src python -m tca.predict.ablation_report
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve

from tca.predict import ablation as ab
from tca.predict.ablation_run import VARIANTS
from tca.predict.bootstrap import METRICS, bootstrap_variants, interval, weighted_metrics
from tca.results import write_result

ADJACENT = [("L2", "L1"), ("L3", "L2"), ("L4", "L3"), ("L5", "L4"), ("L5", "L3"),
            ("L3-nopremises", "L2-nopremises"), ("L4-nopremises", "L3-nopremises"),
            ("L5-nopremises", "L4-nopremises"), ("L2", "L2-nopremises"), ("L5", "L5-nopremises")]  # fmt: skip
DELTA_METRICS = ("roc_auc", "pr_auc", "f1")


def summarise(design: str, table: pd.DataFrame, tag: str, n_boot: int) -> dict:
    preds, info = {}, {}
    for v in VARIANTS:
        p, i = ab.cached(design, v, table, tag=tag)
        preds[v], info[v] = p.sort_values("row").reset_index(drop=True), i
    rows = preds["L1"]["row"].to_numpy()
    assert all((preds[v]["row"].to_numpy() == rows).all() for v in VARIANTS), (
        "variants must share rows"
    )
    groups = pd.factorize(table["neighbourhood"].to_numpy()[rows])[0]
    draws = bootstrap_variants(preds, groups, n_boot)
    y = preds["L1"]["y"].to_numpy()
    prevalence = float(y.mean())
    by_year = table.iloc[rows].assign(y=y).groupby("year")["y"].mean()
    out: dict = {
        "rows": len(rows),
        "prevalence": prevalence,
        "prevalence_by_year": {int(k): float(v) for k, v in by_year.items()},
        "clusters": int(groups.max()) + 1,
        "bootstrap_replicates": n_boot,
        "L0": {
            "roc_auc": 0.5,
            "pr_auc_baseline": prevalence,
            "note": "prevalence baseline: a constant score",
        },
        "variants": {},
        "deltas": {},
    }
    for v in VARIANTS:
        pt = weighted_metrics(
            preds[v]["y"].to_numpy(),
            preds[v]["p"].to_numpy(),
            preds[v]["threshold"].to_numpy(),
            np.ones(len(rows)),
        )
        precision, recall, _ = precision_recall_curve(preds[v]["y"], preds[v]["p"])
        pick = np.unique(np.linspace(0, len(precision) - 1, 101).astype(int))
        cal = (
            pd.DataFrame({"p": preds[v]["p"], "y": preds[v]["y"]})
            .assign(bin=lambda d: pd.qcut(d["p"].rank(method="first"), 10, labels=False))
            .groupby("bin")
            .agg(mean_predicted=("p", "mean"), observed=("y", "mean"), n=("y", "size"))
        )
        out["variants"][v] = {
            **{
                m: {
                    "estimate": float(pt[i]),
                    "lo": interval(draws[v][:, i])[0],
                    "hi": interval(draws[v][:, i])[1],
                }
                for i, m in enumerate(METRICS)
            },
            "pr_curve": {"precision": precision[pick].tolist(), "recall": recall[pick].tolist()},
            "calibration_deciles": cal.to_dict("records"),
            "tuning": [
                {k: val for k, val in f.items() if k not in ("train_rows", "test_rows")}
                for f in info[v]["folds"]
            ],
            "fit_seconds": info[v]["seconds"],
        }
        if info[v]["importance"]:
            blocks = info[v]["importance"][0].keys()
            out["variants"][v]["block_permutation_importance_pr_auc_drop"] = {
                b: float(np.mean([f[b] for f in info[v]["importance"]])) for b in blocks
            }
    for a, b in ADJACENT:
        out["deltas"][f"{a}_minus_{b}"] = {
            m: {
                "estimate": float(
                    out["variants"][a][m]["estimate"] - out["variants"][b][m]["estimate"]
                ),
                "lo": interval(draws[a][:, METRICS.index(m)] - draws[b][:, METRICS.index(m)])[0],
                "hi": interval(draws[a][:, METRICS.index(m)] - draws[b][:, METRICS.index(m)])[1],
            }
            for m in DELTA_METRICS
        }
    return out


def run(n_boot: int = 1000, tag: str = "full", write: bool = True) -> dict:
    table, log = ab.build_table()
    values = {
        "task": "P(robbery | reported major property-type incident); every rung uses the same rows",
        "table": log,
        "designs": {
            "A_neighbourhood_grouped_5fold_cv": summarise("A", table, tag, n_boot),
            "B_temporal_holdout_train_to_2021_test_2022_2023": summarise("B", table, tag, n_boot),
        },
        "evaluation": {
            "inner_tuning": "3-fold grouped CV by neighbourhood inside each training part; PR-AUC picks the grid point",
            "threshold": "maximises F1 on the inner out-of-fold predictions, then applied to the held-out rows",
            "confidence_intervals": f"95% cluster bootstrap over neighbourhoods, {n_boot} replicates, seeded; "
            "differences use the same resamples (paired)",
        },
    }
    if write:
        write_result(
            "predict.ablation",
            "predict",
            values,
            producer="tca.predict.ablation_report",
            description="Ablation ladder L0-L5 (+ no-premises) under neighbourhood-grouped CV and a temporal "
            "holdout: ROC-AUC, PR-AUC, F1 with cluster-bootstrap intervals and paired rung differences",
            formats={
                "designs.*.variants.*.roc_auc.estimate": {"decimals": 3},
                "designs.*.variants.*.pr_auc.estimate": {"decimals": 3},
                "designs.*.variants.*.f1.estimate": {"decimals": 3},
                "designs.*.prevalence": {"percent": True, "decimals": 1},
            },
            inputs=[
                "Auto_Theft_Open_Data.csv",
                "Break_and_Enter_Open_Data.csv",
                "Robbery_Open_Data.csv",
                "Theft_Over_Open_Data.csv",
                "Income_Dataset.xlsx",
            ],
        )
    return values


if __name__ == "__main__":
    v = run()
    for d, res in v["designs"].items():
        print(d, "prevalence", round(res["prevalence"], 3))
        for name, r in res["variants"].items():
            print(
                f"  {name:15s} AUC {r['roc_auc']['estimate']:.3f} [{r['roc_auc']['lo']:.3f},{r['roc_auc']['hi']:.3f}]  "
                f"PR {r['pr_auc']['estimate']:.3f}  F1 {r['f1']['estimate']:.3f}"
            )
