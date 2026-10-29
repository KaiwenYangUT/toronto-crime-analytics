"""The STA303 Explain port against the R re-run (tolerances: PLAN.md section 5, P4)."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def cmp():
    spec = importlib.util.spec_from_file_location(
        "cmp", ROOT / "parity/compare/compare_sta303_model.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def frame(cmp):
    return cmp.sta303_legacy()


def test_glm_summary_gvif_ic(cmp, frame):
    r = cmp.compare_glm(frame)
    assert r["full_coef_rtol"] < 1e-6 and r["full_se_rtol"] < 1e-6 and r["full_z_rtol"] < 1e-6
    assert r["deviance_rtol"] < 1e-6 and r["aic_rtol"] < 1e-6 and r["bic_rtol"] < 1e-6
    assert r["gvif_rtol"] < 1e-6 and r["coef_4dp_identical"]


def test_stepwise_and_lrt(cmp, frame):
    r = cmp.compare_selection(frame)
    assert r["aic_terms_equal"] and r["bic_terms_equal"] and r["lrt_df_equal"]
    assert r["lrt_chisq_rtol"] < 1e-6


def test_influence_measures(cmp, frame):
    r = cmp.compare_influence(frame)
    assert r["dffits_rtol"] < 1e-6 and r["cooks_rtol"] < 1e-6 and r["dfbetas_max_abs_diff"] < 1e-6
    assert r["top20_cooks_equal"] and r["top20_dffits_equal"] and all(r["top20_dfbetas_equal"])


def test_roc_lrm_gaussian(cmp, frame):
    r = cmp.compare_roc_lrm(frame)
    assert r["roc_rows_equal"] and r["auc_label_text_equal"]
    assert r["roc_threshold_max_abs_diff"] < 1e-9 and r["auc_rtol"] < 1e-9
    assert all(v < 1e-6 for v in r["lrm_stats_rtol"].values())
    assert r["gaussian_coef_rtol"] < 1e-6 and r["gaussian_aic_rtol"] < 1e-6


def test_calibration_apparent_and_corrected(cmp, frame):
    r = cmp.compare_calibration(frame)
    assert r["apparent_max_abs_diff"] < 1e-3
    assert r["corrected_max_abs_diff"] < 0.02
    assert r["printed_n_equal"] and r["printed_stats_max_abs_diff"] < 1e-3


@pytest.mark.slow
def test_lasso_against_glmnet(cmp, frame):
    r = cmp.compare_lasso(frame)
    assert r["n_lambda_equal"] and r["lambda_rtol"] < 1e-9 and r["lambda_min_equal"]
    assert r["coef_max_abs_diff"] < 1e-4 and r["linear_predictor_max_abs_diff"] < 1e-4
    assert abs(r["contrast_covid1_minus_covid0_py"] - r["contrast_covid1_minus_covid0_r"]) < 1e-4
    assert r["zero_pattern_equal"] and r["nzero_gap_at_most_the_collinear_dummy"]
    assert r["cvm_max_abs_diff"] < 1e-3
