"""Leakage guards for the ablation ladder (PLAN.md 5.2): nothing about a held-out part may reach
fitting, tuning or the threshold."""

import numpy as np
import pandas as pd
import pytest
from tca.io import ROOT
from tca.predict import ablation as ab
from tca.predict import bootstrap as bs

pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def table():
    return ab.build_table(fraction=0.1)[0]


def test_every_rung_uses_the_same_rows(table):
    # one table feeds every rung; only blocks differ
    assert table["robbery"].isin([0, 1]).all() and len(table) > 5000
    assert table["neighbourhood"].ne("NSA").all() and table[ab.CENSUS].notna().all().all()


def test_grouped_folds_never_share_a_neighbourhood(table):
    splits = ab.outer_splits("A", table)
    assert len(splits) == 5
    seen_test = np.zeros(len(table), int)
    for tr, te in splits:
        assert set(table["neighbourhood"].iloc[tr]).isdisjoint(set(table["neighbourhood"].iloc[te]))
        seen_test[te] += 1
    assert (seen_test == 1).all()  # every row is held out exactly once


def test_inner_folds_are_grouped_too(table):
    train = table.iloc[ab.outer_splits("A", table)[0][0]]
    for tr, va in ab.inner_splits(train):
        assert set(train["neighbourhood"].iloc[tr]).isdisjoint(set(train["neighbourhood"].iloc[va]))


def test_temporal_split_years_are_disjoint_and_ordered(table):
    ((tr, te),) = ab.outer_splits("B", table)
    years_tr, years_te = set(table["year"].iloc[tr]), set(table["year"].iloc[te])
    assert years_tr.isdisjoint(years_te) and max(years_tr) <= 2021 and min(years_te) >= 2022
    assert len(tr) + len(te) == len(table)


def test_feature_builder_learns_only_from_training_rows(table):
    tr, te = ab.outer_splits("A", table)[0]
    train, test = table.iloc[tr], table.iloc[te]
    fb = ab.FeatureBuilder(("time", "geo", "premises", "census")).fit(train)
    before = fb.scaler_.mean_.copy()
    Xtest = fb.transform(test)
    assert np.array_equal(before, fb.scaler_.mean_)  # transform never refits
    census_cols = [i for i, b in enumerate(fb.blocks_of_columns_) if b == "census"]
    assert np.allclose(
        fb.transform(train)[:, census_cols].mean(axis=0), 0, atol=1e-8
    )  # centred on train
    assert not np.allclose(
        Xtest[:, census_cols].mean(axis=0), 0, atol=1e-8
    )  # test is not re-centred


def test_unseen_levels_become_other_not_new_columns(table):
    train = table.iloc[:3000]
    fb = ab.FeatureBuilder(("premises",)).fit(train)
    odd = table.iloc[3000:3010].assign(premises_type="Spaceship", location_type="Moon")
    X = fb.transform(odd)
    assert X.shape[1] == fb.transform(train).shape[1]
    names = fb.columns_
    assert X[:, names.index("premises_type=other")].sum() == 10


def test_tuning_and_threshold_never_read_the_held_out_labels(table):
    tr, te = ab.outer_splits("A", table)[0]
    train, test = table.iloc[tr], table.iloc[te]
    flipped = test.assign(robbery=1 - test["robbery"])
    p1, thr1, _, _, chosen1 = ab.tune_and_fit("logistic", ("time",), train, test)
    p2, thr2, _, _, chosen2 = ab.tune_and_fit("logistic", ("time",), train, flipped)
    assert thr1 == thr2 and chosen1 == chosen2 and np.array_equal(p1, p2)


def test_best_f1_threshold_picks_a_cut_between_distinct_scores():
    y = np.array([0, 0, 1, 1, 1, 0])
    p = np.array([0.1, 0.2, 0.9, 0.8, 0.7, 0.3])
    thr = ab.best_f1_threshold(y, p)
    assert thr == 0.7 and ((p >= thr) == y.astype(bool)).all()


def test_cluster_bootstrap_draws_are_seeded_and_cover_all_clusters():
    groups = np.repeat(np.arange(12), 5)
    a, b = bs.draw_weights(groups, 50), bs.draw_weights(groups, 50)
    assert np.array_equal(a, b) and (a.sum(axis=1) == 12).all()
    p = np.linspace(0, 1, 60)
    y = (p > 0.6).astype(int)  # x ranks positives first; z (1 - p) ranks them last
    v = {
        "x": pd.DataFrame({"y": y, "p": p, "threshold": 0.5}),
        "z": pd.DataFrame({"y": y, "p": 1 - p, "threshold": 0.5}),
    }
    out = bs.bootstrap_variants(v, groups, n_boot=30, n_jobs=1)
    assert out["x"].shape == (30, 5) and np.nanmean(out["x"][:, 0]) > np.nanmean(out["z"][:, 0])
