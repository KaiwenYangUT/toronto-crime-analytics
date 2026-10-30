"""Register the JSC370 six-model benchmark (R re-run vs Python port) as a results file for the site.
Run: PYTHONPATH=pipeline/src .venv/bin/python parity/compare/jsc370_benchmark_results.py"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.results import write_result

MODELS = {
    "glm": "Logistic regression",
    "tree": "Decision tree",
    "bagging": "Bagging",
    "rf": "Random forest",
    "gbm": "Gradient boosting (gbm)",
    "xgb": "XGBoost",
}
TIER_NAMES = {
    "glm": "glm",
    "tree": "tree",
    "bagging": "bagging",
    "rf": "rf",
    "gbm": "gbm",
    "xgb": "xgb",
}


def main() -> None:
    port = json.loads((ROOT / "parity" / "reports" / "jsc370_port.json").read_text())
    values: dict = {"models": {}, "tiers": port["tiers"]}
    for key, label in MODELS.items():
        m = port[key]
        values["models"][key] = {
            "label": label,
            "r": {
                "test_accuracy": m["test_accuracy_r"],
                "f1": m["f1_r"],
                "tp": m["r"]["tp"],
                "fp": m["r"]["fp"],
            },
            "python": {
                "test_accuracy": m["test_accuracy_python"],
                "f1": m["f1_python"],
                "tp": m["python"]["tp"],
                "fp": m["python"]["fp"],
            },
            "identical_matrix": m["identical_matrix"],
            "tp_within": m["tp_within"],
            "f1_within": m["f1_within"],
        }
    values["xgb_ten_seed_mean"] = {
        k: port["xgb_seed_spread"][k] for k in ("tp_mean", "fp_mean", "f1_mean")
    }
    write_result(
        "predict.jsc370_benchmark",
        "predict",
        values,
        producer="parity/compare/jsc370_benchmark_results.py",
        description="JSC370 six-model benchmark on the original 2020 split: R re-run (equal to the published "
        "table at seven decimals) vs the Python port, with the tier ranking",
        formats={
            "models.*.r.test_accuracy": {"decimals": 3},
            "models.*.python.test_accuracy": {"decimals": 3},
            "models.*.r.f1": {"decimals": 3},
            "models.*.python.f1": {"decimals": 3},
            "models.*.r.tp": {"decimals": 0},
            "models.*.python.tp": {"decimals": 0},
            "models.*.r.fp": {"decimals": 0},
            "models.*.python.fp": {"decimals": 0},
            "xgb_ten_seed_mean.f1_mean": {"decimals": 3},
            "xgb_ten_seed_mean.tp_mean": {"decimals": 1},
        },
    )


if __name__ == "__main__":
    main()
