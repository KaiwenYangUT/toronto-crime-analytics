"""Hyperparameter search: grid size, ranking, and that the test frame plays no part in the choice."""

import pytest
from tca.predict import jsc370_port as j
from tca.predict import tuning

pytestmark = pytest.mark.skipif(
    not (j.R_DIR / "train_data.csv.xz").exists(), reason="needs the R exports"
)


def test_default_grid_matches_carets_108_combinations():
    assert len(tuning._grid(tuning.XGB_GRID)) == 108


def test_tune_xgb_ranks_by_cv_accuracy_and_ignores_the_test_frame():
    train, test = j.load_r_frames()
    small = train.sample(1500, random_state=1)
    grid = {
        "nrounds": [10, 30],
        "max_depth": [1, 3],
        "eta": [0.3],
        "colsample_bytree": [0.8],
        "subsample": [1.0],
    }
    table, best = tuning.tune_xgb(small, test, grid=grid, folds=3, n_jobs=1)
    assert len(table) == 4 and table["accuracy"].is_monotonic_decreasing
    assert best["max_depth"] in (1, 3)
    # the same choice when the test labels are scrambled: the search never reads them
    scrambled = test.assign(Robbery=~test["Robbery"])
    _, best2 = tuning.tune_xgb(small, scrambled, grid=grid, folds=3, n_jobs=1)
    assert best == best2


def test_forest_mtry_is_one_of_the_candidates():
    train, test = j.load_r_frames()
    table, mtry = tuning.tune_forest_mtry(
        train.sample(1500, random_state=1), test, candidates=[2, 4], ntree=60
    )
    assert mtry in (2, 4) and len(table) == 2
