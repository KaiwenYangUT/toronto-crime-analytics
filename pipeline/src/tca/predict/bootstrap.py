"""Cluster bootstrap over neighbourhoods for the ablation predictions.

Neighbourhoods (the clusters) are resampled with replacement; a row's weight is how many times
its neighbourhood was drawn, so no model is refitted. One draw is shared by every variant, which
makes differences between variants a paired bootstrap."""

from __future__ import annotations

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.metrics import average_precision_score, roc_auc_score

from tca.definitions import SEED

METRICS = ("roc_auc", "pr_auc", "precision", "recall", "f1")


def weighted_metrics(y: np.ndarray, p: np.ndarray, thr: np.ndarray, w: np.ndarray) -> np.ndarray:
    """ROC-AUC, PR-AUC and precision/recall/F1 at each row's tuned threshold, with row weights."""
    pred = p >= thr
    tp = float(np.sum(w * (pred & (y == 1))))
    fp = float(np.sum(w * (pred & (y == 0))))
    fn = float(np.sum(w * (~pred & (y == 1))))
    precision = tp / (tp + fp) if tp + fp else np.nan
    recall = tp / (tp + fn) if tp + fn else np.nan
    f1 = 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else np.nan
    return np.array(
        [
            roc_auc_score(y, p, sample_weight=w),
            average_precision_score(y, p, sample_weight=w),
            precision,
            recall,
            f1,
        ]
    )


def draw_weights(groups: np.ndarray, n_boot: int, seed: int = SEED) -> np.ndarray:
    """(n_boot, n_groups) draw counts: how often each neighbourhood appears in each replicate."""
    rng = np.random.default_rng(seed)
    g = int(groups.max()) + 1
    return np.stack([np.bincount(rng.integers(0, g, g), minlength=g) for _ in range(n_boot)])


def _one(
    counts: np.ndarray, groups: np.ndarray, arrays: dict[str, tuple[np.ndarray, ...]]
) -> dict[str, np.ndarray]:
    w = counts[groups].astype(float)
    keep = w > 0
    return {
        name: weighted_metrics(y[keep], p[keep], thr[keep], w[keep])
        for name, (y, p, thr) in arrays.items()
    }


def bootstrap_variants(
    variants: dict[str, pd.DataFrame], groups: np.ndarray, n_boot: int = 1000, n_jobs: int = 4
) -> dict[str, np.ndarray]:
    """Metric draws, shape (n_boot, len(METRICS)), for every variant on the same replicates.

    ``variants`` hold ``y``, ``p`` and ``threshold`` aligned to ``groups`` (integer neighbourhood codes
    per row). The prediction arrays are passed as arguments, which joblib memory-maps once, rather
    than captured in a closure that would be pickled with every task."""
    draws = draw_weights(groups, n_boot)
    arrays = {
        name: (v["y"].to_numpy(), v["p"].to_numpy(), v["threshold"].to_numpy())
        for name, v in variants.items()
    }
    results = Parallel(n_jobs=n_jobs)(delayed(_one)(c, groups, arrays) for c in draws)
    return {name: np.stack([r[name] for r in results]) for name in variants}


def interval(draws: np.ndarray, level: float = 0.95) -> tuple[float, float]:
    a = (1 - level) / 2
    lo, hi = np.nanquantile(draws, [a, 1 - a])
    return float(lo), float(hi)
