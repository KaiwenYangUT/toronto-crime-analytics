"""glmnet-equivalent L1-penalised logistic regression (alpha = 1) and ``cv.glmnet``.

glmnet minimises ``-loglik / N + lambda * sum |beta_j|`` on predictors standardised to unit
variance (divisor N), with an unpenalised intercept, and reports coefficients on the original
scale. Each lambda is solved by proximal Newton: a weighted least-squares quadratic
approximation (weights p(1 - p)) minimised by cyclic coordinate descent, repeated until the
deviance stops changing.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

PMIN = 1e-5  # cv.glmnet clips predicted probabilities to [PMIN, 1 - PMIN] for the deviance


@dataclass
class Path:
    lambdas: np.ndarray
    intercept: np.ndarray  # standardised scale (same intercept as the original scale)
    beta: np.ndarray  # (n_lambda, p), standardised scale
    scale: np.ndarray  # per-column standard deviation (divisor N)
    center: np.ndarray

    def coef_original(self) -> tuple[np.ndarray, np.ndarray]:
        """(intercepts, coefficients) on the original predictor scale."""
        b = self.beta / self.scale
        return self.intercept - b @ self.center, b


def standardize(x: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    center = x.mean(axis=0)
    scale = np.sqrt(((x - center) ** 2).mean(axis=0))
    return (x - center) / scale, center, scale


def lambda_grid(
    xs: np.ndarray, y: np.ndarray, n: int = 100, ratio: float | None = None
) -> np.ndarray:
    """glmnet's default sequence: lambda_max is the smallest lambda with all coefficients zero,
    then ``n`` values log-spaced down to ``ratio * lambda_max`` (1e-4 when N > p)."""
    nobs, p = xs.shape
    ratio = ratio if ratio is not None else (1e-4 if nobs > p else 1e-2)
    lam_max = float(np.max(np.abs(xs.T @ (y - y.mean())) / nobs))
    return lam_max * np.exp(np.linspace(0.0, np.log(ratio), n))


def _soft(z: float, t: float) -> float:
    """Soft threshold. A value within 1e-9 (relative) of the threshold counts as on it, so exact
    ties at lambda_max (the two Covid dummies have identical gradients) both stay at zero."""
    if abs(z) <= t * (1.0 + 1e-9):
        return 0.0
    return float(np.sign(z) * (abs(z) - t))


def _deviance(y: np.ndarray, eta: np.ndarray) -> float:
    p = 1.0 / (1.0 + np.exp(-eta))
    p = np.clip(p, PMIN, 1 - PMIN)
    return float(-2.0 * np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def fit_path(
    xs: np.ndarray,
    y: np.ndarray,
    lambdas: np.ndarray,
    tol: float = 1e-11,
    max_outer: int = 100,
    max_inner: int = 10_000,
    early_stop: bool = False,
) -> tuple[np.ndarray, np.ndarray]:
    """Solve the penalised problem for each lambda in order, warm-starting from the previous one.

    ``early_stop`` is glmnet's rule for an automatic grid: from the 5th lambda on, stop once the
    fraction of null deviance explained exceeds 0.999 or gains less than 1e-5. (The gain is an
    absolute difference: that reproduces the 44-value path R returned for this data.)"""
    nobs, p = xs.shape
    b0, b = float(np.log(y.mean() / (1 - y.mean()))), np.zeros(p)
    intercepts, betas = [], []
    null_dev = _deviance(y, np.full(nobs, b0))
    ratio_prev = 0.0
    for m, lam in enumerate(lambdas, start=1):
        dev_old = np.inf
        for _ in range(max_outer):
            eta = b0 + xs @ b
            prob = np.clip(1.0 / (1.0 + np.exp(-eta)), PMIN, 1 - PMIN)
            w = prob * (1.0 - prob)
            z = eta + (y - prob) / w
            # weighted least squares on (z, xs) with L1 penalty, cyclic coordinate descent
            resid = z - eta  # = z - b0 - xs b
            wsum = w.sum()
            xw2 = (w[:, None] * xs**2).mean(axis=0)
            for _inner in range(max_inner):
                change = 0.0
                d0 = (w * resid).sum() / wsum  # intercept update
                b0 += d0
                resid -= d0
                change = max(change, abs(d0))
                for j in range(p):
                    zj = (w * xs[:, j] * resid).mean() + xw2[j] * b[j]
                    new = _soft(zj, lam) / xw2[j]
                    d = new - b[j]
                    if d != 0.0:
                        resid -= d * xs[:, j]
                        b[j] = new
                        change = max(change, abs(d) * np.sqrt(xw2[j]))
                if change < 1e-13:
                    break
            dev = _deviance(y, b0 + xs @ b)
            if abs(dev_old - dev) < tol * (abs(dev) + 0.1):
                break
            dev_old = dev
        intercepts.append(b0)
        betas.append(b.copy())
        if early_stop and m >= 5:
            ratio = 1.0 - dev / null_dev
            if ratio > 0.999 or ratio - ratio_prev < 1e-5:
                break
            ratio_prev = ratio
        elif early_stop:
            ratio_prev = 1.0 - dev / null_dev
    return np.array(intercepts), np.array(betas)


def glmnet_path(x: np.ndarray, y: np.ndarray, lambdas: np.ndarray | None = None, **kw) -> Path:
    """The regularisation path; a supplied ``lambdas`` is solved as given (no early stop)."""
    xs, center, scale = standardize(x)
    lam = lambdas if lambdas is not None else lambda_grid(xs, y)
    b0, beta = fit_path(xs, y, lam, early_stop=lambdas is None, **kw)
    return Path(lam[: len(b0)], b0, beta, scale, center)


def cv_glmnet(x: np.ndarray, y: np.ndarray, foldid: np.ndarray, **kw) -> dict:
    """``cv.glmnet(type.measure = "deviance")`` with the supplied fold assignment."""
    full = glmnet_path(x, y, **kw)
    lam = full.lambdas
    folds = np.unique(foldid)
    raw = np.zeros((len(folds), len(lam)))
    sizes = np.zeros(len(folds))
    for i, k in enumerate(folds):
        tr, te = foldid != k, foldid == k
        sub = glmnet_path(x[tr], y[tr], lambdas=lam, **kw)
        b0, b = sub.coef_original()
        eta = b0[:, None] + b @ x[te].T  # (n_lambda, n_test)
        p = np.clip(1.0 / (1.0 + np.exp(-eta)), PMIN, 1 - PMIN)
        dev = -2.0 * (y[te] * np.log(p) + (1 - y[te]) * np.log(1 - p))
        raw[i] = dev.mean(axis=1)
        sizes[i] = te.sum()
    cvm = np.average(raw, axis=0, weights=sizes)
    cvsd = np.sqrt(np.average((raw - cvm) ** 2, axis=0, weights=sizes) / (len(folds) - 1))
    return {
        "lambda": lam,
        "cvm": cvm,
        "cvsd": cvsd,
        "cvup": cvm + cvsd,
        "cvlo": cvm - cvsd,
        "nzero": (full.beta != 0).sum(axis=1),
        "lambda_min": float(lam[int(np.argmin(cvm))]),
        "path": full,
    }
