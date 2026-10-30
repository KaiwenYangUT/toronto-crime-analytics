"""STA303 v2: the cluster-robust covariance against statsmodels, and properties of the model."""

import numpy as np
import pandas as pd
import pytest
import statsmodels.api as sm
from tca.explain import sta303_v2 as v2
from tca.explain.sta303_port import fit_glm
from tca.io import ROOT

needs_data = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


def test_cluster_covariance_matches_statsmodels():
    rng = np.random.default_rng(0)
    n, g = 4000, 40
    groups = rng.integers(0, g, n)
    X = pd.DataFrame({"c": 1.0, "a": rng.normal(size=n), "b": rng.normal(size=n)})
    effect = rng.normal(0, 0.4, g)[groups]
    y = (rng.random(n) < 1 / (1 + np.exp(-(0.3 * X["a"] - 0.2 * X["b"] + effect)))).astype(float)
    ours = v2.cluster_cov(fit_glm(X, y, epsilon=1e-12, max_iter=50), groups)
    ref = sm.GLM(y, X, family=sm.families.Binomial()).fit(
        cov_type="cluster", cov_kwds={"groups": groups}
    )
    assert np.allclose(ours, ref.cov_params(), rtol=1e-5)


def test_design_references_and_harmonic_swap():
    df = pd.DataFrame(
        {"hour": [12, 0], "month": [1, 7], "weekday": [1, 6], "post2019": [0, 1], "dark": [0, 1]}
    )
    X = v2.design(df)
    assert (
        "hour=12" not in X.columns and "month=01" not in X.columns and "weekday=1" not in X.columns
    )
    assert X.shape[1] == 1 + 23 + 11 + 6 + 2
    assert v2.design(df, harmonic=True).shape[1] == 1 + 6 + 4 + 6 + 2


@pytest.fixture(scope="module")
def result():
    return v2.run(write=False)


@needs_data
def test_rows_and_exclusions_are_logged(result):
    log = result["log"]
    assert log["model_rows"] == result["n"] == 159_056
    assert log["nsa_rows_dropped"] == 16 and log["neighbourhoods"] == 158
    assert (
        log["source_rows"] - log["rows_outside_2014_2023_or_invalid_date"]
        >= log["ledger_final_rows"]
    )
    assert result["classes"]["Robbery"] == result["robbery"]


@needs_data
def test_post_2019_effect_and_intervals(result):
    p = result["post2019"]
    assert 0.5 < p["or"] < 0.6 and p["or_lo"] < p["or"] < p["or_hi"]
    # clustering by neighbourhood widens the interval
    assert p["robust_or_hi"] - p["robust_or_lo"] > p["or_hi"] - p["or_lo"]


@needs_data
def test_composition_check_shows_the_auto_theft_shift(result):
    c = result["composition"]
    assert (
        c["Auto Theft"]["post2019"]["or"]
        < c["Theft Over"]["post2019"]["or"]
        < c["Break and Enter"]["post2019"]["or"]
    )
    assert set(c) == {"Auto Theft", "Break and Enter", "Theft Over"}


@needs_data
def test_factor_model_beats_the_harmonic_sensitivity_model(result):
    h = result["fit"]["harmonic"]
    assert h["delta_aic"] > 0 and h["delta_bic"] > 0


@needs_data
def test_cv_is_seeded_and_calibration_has_ten_bins(result):
    assert result["cv"]["seed"] == 303313 and len(result["cv"]["auc_folds"]) == 5
    assert 0.55 < result["cv"]["auc_mean"] < 0.7
    assert len(result["calibration_deciles"]) == 10
    assert all(
        abs(b["mean_predicted"] - b["observed"]) < 0.03 for b in result["calibration_deciles"]
    )


@needs_data
def test_two_runs_have_the_same_identity_hash():
    import json

    from tca.results import canonical

    a = v2.run(write=False)
    b = v2.run(write=False)
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)
    assert canonical(
        {"_provenance": {"created": "x", "git_sha": "y", "seed": 1}, "values": a}
    ) == canonical({"_provenance": {"created": "z", "git_sha": "w", "seed": 1}, "values": b})
