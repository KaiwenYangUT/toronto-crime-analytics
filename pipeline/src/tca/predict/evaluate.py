"""Model comparison helpers: F1 from predictions, paired bootstrap, and the tier rule."""

from __future__ import annotations

import numpy as np

from tca.definitions import SEED


def f1_from_counts(tp: np.ndarray, fp: np.ndarray, fn: np.ndarray) -> np.ndarray:
    """F1 = 2 TP / (2 TP + FP + FN); 0/0 (no positives predicted or present) gives NaN."""
    denom = 2.0 * tp + fp + fn
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where(denom > 0, 2.0 * tp / denom, np.nan)


def bootstrap_indices(n: int, reps: int = 1000, seed: int = SEED) -> np.ndarray:
    """One index matrix, reused for every model and for both R's and Python's predictions."""
    return np.random.default_rng(seed).integers(0, n, size=(reps, n))


def bootstrap_f1(actual: np.ndarray, pred: np.ndarray, indices: np.ndarray) -> np.ndarray:
    a, p = np.asarray(actual, bool), np.asarray(pred, bool)
    tp = (a & p)[indices].sum(axis=1)
    fp = (~a & p)[indices].sum(axis=1)
    fn = (a & ~p)[indices].sum(axis=1)
    return f1_from_counts(tp, fp, fn)


def point_f1(actual: np.ndarray, pred: np.ndarray) -> float:
    a, p = np.asarray(actual, bool), np.asarray(pred, bool)
    return float(
        f1_from_counts(
            np.array(int((a & p).sum())),
            np.array(int((~a & p).sum())),
            np.array(int((a & ~p).sum())),
        )
    )


def tier_partition(
    actual: np.ndarray, preds: dict[str, np.ndarray], indices: np.ndarray, level: float = 0.95
) -> list[list[str]]:
    """Sort models by point F1, walk down the list; a model starts a new tier when the paired
    bootstrap CI of (leader F1 - model F1) excludes zero. Undefined F1 sorts last."""
    f1 = {m: point_f1(actual, p) for m, p in preds.items()}
    order = sorted(f1, key=lambda m: -np.inf if np.isnan(f1[m]) else f1[m], reverse=True)
    boot = {m: bootstrap_f1(actual, preds[m], indices) for m in order}
    alpha = (1.0 - level) / 2.0
    tiers: list[list[str]] = [[order[0]]]
    leader = order[0]
    for m in order[1:]:
        delta = boot[leader] - boot[m]
        lo, hi = np.nanquantile(delta, [alpha, 1.0 - alpha])
        if lo > 0 or hi < 0:
            tiers.append([m])
            leader = m
        else:
            tiers[-1].append(m)
    return tiers
