"""The JSC370 Predict port against the R re-run (tolerances: PLAN.md section 5, P4).

Where a tolerance is missed the miss is recorded in PARITY.md; the tests below assert the
documented outcome so a regression in either direction is noticed."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "parity/r_outputs/jsc370/train_data.csv.xz").exists(), reason="needs the R exports"
)


@pytest.fixture(scope="module")
def report():
    spec = importlib.util.spec_from_file_location(
        "cmp", ROOT / "parity/compare/compare_jsc370_models.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.compare()


def test_glm_is_identical_to_r(report):
    assert report["glm"]["identical_matrix"]
    d = report["glm_detail"]
    assert d["coef_rtol"] < 1e-6 and d["test_prob_max_abs_diff"] < 1e-9
    assert d["aliased_python"] == [d["aliased_r"]]


def test_gbm_matches_r(report):
    assert report["gbm"]["tp_within"] and report["gbm"]["fp_within"] and report["gbm"]["f1_within"]


@pytest.mark.parametrize("model", ["bagging", "rf"])
def test_forests_within_tolerance(report, model):
    r = report[model]
    assert r["tp_within"] and r["fp_within"] and r["f1_within"]


def test_bagging_importance_top3(report):
    assert report["importance"]["bag_top3_set_equal"]


def test_xgboost_mean_over_fixed_seeds_within_tolerance(report):
    s = report["xgb_seed_spread"]
    assert s["tp_mean_within"] and s["fp_mean_within"] and s["f1_mean_within"]
    assert len(s["seeds"]) == 10


def test_documented_deviations(report):
    # tree TP outside max(10, 10%) by 2, and RF top-3 importance swaps Hour/Premises_Type
    assert (
        not report["tree"]["tp_within"]
        and report["tree"]["fp_within"]
        and report["tree"]["f1_within"]
    )
    assert not report["importance"]["rf_top3_set_equal"]


def test_tier_partition_identical_to_r(report):
    t = report["tiers"]
    assert t["r_prediction_counts_match_matrices"]
    assert t["identical"]
    assert t["r"] == [["rf", "bagging"], ["xgb"], ["tree"], ["gbm", "glm"]]
