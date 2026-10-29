import numpy as np
from tca.predict import evaluate as ev


def test_f1_from_counts_undefined_is_nan():
    assert np.isnan(ev.f1_from_counts(np.array(0), np.array(0), np.array(0)))
    assert ev.f1_from_counts(np.array(2), np.array(1), np.array(1)) == 0.5


def test_bootstrap_indices_are_seeded_and_shared():
    a, b = ev.bootstrap_indices(50, 20), ev.bootstrap_indices(50, 20)
    assert (a == b).all() and a.shape == (20, 50) and a.max() < 50


def test_tier_rule_splits_clearly_different_models():
    rng = np.random.default_rng(0)
    y = rng.random(2000) < 0.2
    good = y.copy()
    good[rng.random(2000) < 0.05] ^= True
    weak = y & (rng.random(2000) < 0.1)
    idx = ev.bootstrap_indices(2000, 200)
    tiers = ev.tier_partition(y, {"good": good, "twin": good.copy(), "weak": weak}, idx)
    assert tiers == [["good", "twin"], ["weak"]]
