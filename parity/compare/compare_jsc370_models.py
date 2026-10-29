"""Compare the Python JSC370 models (tca.predict.jsc370_port) with the R re-run.
Tolerances (PLAN.md, P4): GLM identical confusion matrix and coefficients within rtol 1e-6;
other models: test TP and FP each within max(10, 10% of R's count) and F1 within 0.04.
Run: .venv/bin/python parity/compare/compare_jsc370_models.py"""

import json
import lzma
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.predict import evaluate as ev
from tca.predict import jsc370_port as j

R = ROOT / "parity/r_outputs/jsc370"
KEYS = {"glm": "glm", "tree": "tree", "bagging": "bag", "rf": "rf", "gbm": "gbm", "xgb": "xgb"}


def r_cm(name: str, split: str) -> dict:
    c = json.loads((R / "confusion_matrices.json").read_text())[f"{name}_{split}"]["counts"]
    return {"tn": c[0], "fn": c[1], "fp": c[2], "tp": c[3]}  # column-major, rows = actual


def within(py: int, r: int) -> bool:
    return abs(py - r) <= max(10, 0.10 * r)


def compare() -> dict:
    out: dict = {}
    train, test = j.load_r_frames()
    res = j.run_all()
    yte = res["actual_test"]
    for name, rname in KEYS.items():
        cm = j.confusion(yte, res[name]["test_pred"])
        r = r_cm(rname, "test")
        sp, sr = j.scores(cm), j.scores(r)
        out[name] = {
            "python": cm,
            "r": r,
            "f1_python": sp["f1"],
            "f1_r": sr["f1"],
            "train_accuracy_python": j.scores(
                j.confusion(res["actual_train"], res[name]["train_pred"])
            )["accuracy"],
            "train_accuracy_r": j.scores(r_cm(rname, "train"))["accuracy"],
            "test_accuracy_python": sp["accuracy"],
            "test_accuracy_r": sr["accuracy"],
            "tp_within": within(cm["tp"], r["tp"]),
            "fp_within": within(cm["fp"], r["fp"]),
            "f1_within": bool(abs(sp["f1"] - sr["f1"]) <= 0.04),
            "identical_matrix": cm == r,
        }
    # GLM: coefficients and test probabilities
    fit = res["glm"]["fit"]
    r_coef = pd.read_csv(R / "glm_coef.csv").set_index("term")["Estimate"]
    py = fit.params
    out["glm_detail"] = {
        "aliased_python": res["glm"]["aliased"],
        "aliased_r": j.r_json("glm_fit.json")["aliased"],
        "coef_rtol": float(
            np.max(np.abs(py - r_coef.reindex(py.index)) / np.abs(r_coef.reindex(py.index)))
        ),
        "auc_python": j.auc(yte, res["glm"]["test_prob"]),
    }
    with lzma.open(R / "test_predictions.csv.xz", "rt") as fh:
        preds = pd.read_csv(fh)
    out["glm_detail"]["test_prob_max_abs_diff"] = float(
        np.max(np.abs(res["glm"]["test_prob"] - preds["glm_prob"].to_numpy()))
    )
    out["tree_detail"] = {
        "leaves_python": res["tree"]["model"].n_leaves,
        "leaves_r": j.r_json("tree_summary.json")["leaves_pruned"],
        "note": "pruned at R's cp on a scikit-learn tree; factors ordered by response rate",
    }
    top = lambda s, k: list(s.index[:k])
    r_rf = pd.read_csv(R / "rf_importance.csv").sort_values("MeanDecreaseGini", ascending=False)
    r_bag = pd.read_csv(R / "bag_importance.csv").sort_values("MeanDecreaseGini", ascending=False)
    out["importance"] = {
        "rf_top3_python": top(res["rf"]["importance"], 3),
        "rf_top3_r": list(r_rf["variable"][:3]),
        "bag_top3_python": top(res["bagging"]["importance"], 3),
        "bag_top3_r": list(r_bag["variable"][:3]),
    }
    out["importance"]["rf_top3_set_equal"] = set(out["importance"]["rf_top3_python"]) == set(
        out["importance"]["rf_top3_r"]
    )
    out["importance"]["bag_top3_set_equal"] = set(out["importance"]["bag_top3_python"]) == set(
        out["importance"]["bag_top3_r"]
    )
    # tier rule on the same bootstrap indices for R's and Python's predictions
    with lzma.open(R / "test_predictions.csv.xz", "rt") as fh:
        rp = pd.read_csv(fh)
    r_preds = {
        "glm": rp["glm_class"].astype(int).astype(bool).to_numpy(),
        "tree": rp["tree_class"].astype(str).str.upper().eq("TRUE").to_numpy(),
        "bagging": rp["bag_class"].astype(str).str.upper().eq("TRUE").to_numpy(),
        "rf": rp["rf_class"].astype(str).str.upper().eq("TRUE").to_numpy(),
        "gbm": rp["gbm_class"].astype(int).astype(bool).to_numpy(),
        "xgb": rp["xgb_class"].astype(str).str.upper().eq("TRUE").to_numpy(),
    }
    idx = ev.bootstrap_indices(len(yte), reps=1000)
    py_preds = {m: res[m]["test_pred"] for m in KEYS}
    out["tiers"] = {
        "r": ev.tier_partition(yte, r_preds, idx),
        "python": ev.tier_partition(yte, py_preds, idx),
        "r_prediction_counts_match_matrices": all(
            j.confusion(yte, r_preds[m]) == r_cm(KEYS[m], "test") for m in KEYS
        ),
    }
    out["tiers"]["identical"] = out["tiers"]["r"] == out["tiers"]["python"]
    # the alternative factor handling for the forests, for transparency
    alt = {}
    for name, mtry, rname in (("bagging", len(j.PREDICTORS), "bag"), ("rf", 4, "rf")):
        forest, _, xte = j.fit_forest(train, test, mtry=mtry, character_as_codes=False)
        cm = j.confusion(yte, j.hard_vote(forest, xte))
        imp = pd.Series(forest.feature_importances_, index=j.PREDICTORS).sort_values(
            ascending=False
        )
        alt[name] = {
            "python": cm,
            "r": r_cm(rname, "test"),
            "f1": j.scores(cm)["f1"],
            "top3": list(imp.index[:3]),
        }
    out["forest_alternative_response_rate_ordering"] = alt
    # XGBoost is random; judge the mean over fixed seeds
    spread = j.xgb_seed_spread(train, test, j.r_json("xgb_summary.json")["best_tune"])
    r = r_cm("xgb", "test")
    out["xgb_seed_spread"] = {
        "seeds": [int(s) for s in spread["seed"]],
        "tp": [int(v) for v in spread["tp"]],
        "fp": [int(v) for v in spread["fp"]],
        "f1": [round(float(v), 4) for v in spread["f1"]],
        "tp_mean": float(spread["tp"].mean()),
        "fp_mean": float(spread["fp"].mean()),
        "f1_mean": float(spread["f1"].mean()),
        "tp_mean_within": within(spread["tp"].mean(), r["tp"]),
        "fp_mean_within": within(spread["fp"].mean(), r["fp"]),
        "f1_mean_within": bool(abs(spread["f1"].mean() - j.scores(r)["f1"]) <= 0.04),
    }
    return out


if __name__ == "__main__":
    report = compare()
    path = ROOT / "parity/reports/jsc370_port.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(report, indent=1, default=str) + "\n")
    print(f"wrote {path.relative_to(ROOT)}")
    for k in KEYS:
        v = report[k]
        print(
            k,
            "matrix identical"
            if v["identical_matrix"]
            else f"TP {v['python']['tp']}/{v['r']['tp']} FP {v['python']['fp']}/{v['r']['fp']}",
            "tp",
            v["tp_within"],
            "fp",
            v["fp_within"],
            "f1",
            v["f1_within"],
        )
    print(
        "xgb 10-seed mean:",
        {k: v for k, v in report["xgb_seed_spread"].items() if k.endswith(("mean", "within"))},
    )
