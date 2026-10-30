"""Statistically clear is not the same as predictive (PLAN.md 5.4).

For the same time features, set side by side what the inference model finds (how many terms have
a cluster-robust 95% interval excluding odds ratio 1), how well time alone discriminates (rung L1),
what each feature block adds (paired differences) and which block the best model leans on
(grouped permutation importance). Reads the two results files; computes nothing new from data.
"""

from __future__ import annotations

import json

from tca.io import ROOT
from tca.results import write_result


def load(key: str) -> dict:
    index = json.loads((ROOT / "results" / "index.json").read_text())
    return json.loads((ROOT / index[key]["file"]).read_text())["values"]


def clear(term: dict) -> bool:
    return term["robust_or_lo"] > 1 or term["robust_or_hi"] < 1


def run(write: bool = True) -> dict:
    inf, abl = load("explain.sta303_v2"), load("predict.ablation")
    groups = {
        "hour": inf["hour_or_vs_12"],
        "month": inf["month_or_vs_jan"],
        "weekday": inf["weekday_or_vs_mon"],
        "darkness": {"dark": inf["dark"]},
        "post2019": {"post2019": inf["post2019"]},
    }
    inference = {
        g: {"terms": len(t), "clear": sum(clear(v) for v in t.values())} for g, t in groups.items()
    }
    time_terms = sum(
        v["terms"] for k, v in inference.items() if k in ("hour", "month", "weekday", "darkness")
    )
    time_clear = sum(
        v["clear"] for k, v in inference.items() if k in ("hour", "month", "weekday", "darkness")
    )
    designs = {}
    for name, d in abl["designs"].items():
        v = d["variants"]
        designs[name] = {
            "prevalence": d["prevalence"],
            "time_only_L1": {m: v["L1"][m] for m in ("roc_auc", "pr_auc", "f1")},
            "pr_auc_baseline": d["prevalence"],
            "added_by_block": {
                "premises_and_location_and_geography_L2_minus_L1": d["deltas"]["L2_minus_L1"],
                "census_L3_minus_L2": d["deltas"]["L3_minus_L2"],
                "forest_L4_minus_L3": d["deltas"]["L4_minus_L3"],
                "xgboost_L5_minus_L4": d["deltas"]["L5_minus_L4"],
                "premises_and_location_alone_L2_minus_L2_nopremises": d["deltas"][
                    "L2_minus_L2-nopremises"
                ],
            },
            "xgboost_block_permutation_importance_pr_auc_drop": v["L5"].get(
                "block_permutation_importance_pr_auc_drop"
            ),
        }
    # the message is only issued when the numbers meet its stated criteria
    criteria = {"most_time_terms_clear": time_clear / time_terms > 0.5,
                "time_alone_ci_upper_below_0.65_both_designs": all(
                    d["time_only_L1"]["roc_auc"]["hi"] < 0.65 for d in designs.values())}  # fmt: skip
    message = (
        "Many time terms are statistically clear, yet time alone predicts little beyond the base rate"
        if all(criteria.values())
        else "Criteria not met: do not use the 'clear but not predictive' message"
    )
    values = {
        "message": message,
        "message_criteria": criteria,
        "inference": inference,
        "time_terms": time_terms,
        "time_terms_clear": time_clear,
        "post2019_or": inf["post2019"]["or"],
        "sta303_v2_cv_auc": inf["cv"]["auc_mean"],
        "designs": designs,
    }
    if write:
        write_result(
            "predict.inference_vs_prediction",
            "predict",
            values,
            producer="tca.predict.inference_vs_prediction",
            description="Side-by-side: statistically clear time terms vs the predictive lift of time, "
            "location/premises and census blocks",
            formats={"post2019_or": {"decimals": 2}, "sta303_v2_cv_auc": {"decimals": 3}},
        )
    return values


if __name__ == "__main__":
    v = run()
    print(v["time_terms_clear"], "of", v["time_terms"], "time terms clear")
    for k, d in v["designs"].items():
        print(
            k,
            {m: round(x["estimate"], 3) for m, x in d["time_only_L1"].items()},
            "prevalence",
            round(d["prevalence"], 3),
        )
