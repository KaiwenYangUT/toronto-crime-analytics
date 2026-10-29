"""Faithful port of the STA303 inference analysis (logistic regression on robbery vs other).

R's formulas are implemented directly rather than relying on statsmodels defaults:
``car::vif`` (GVIF from the coefficient correlation matrix), ``step()`` with ``extractAIC``,
``lmtest::lrtest`` and the glm influence measures (``lm.influence`` on the IRLS weights with
deviance residuals, Cook's distance with Pearson residuals).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from scipy import stats

TERMS = [
    "Presence_of_Sunset",
    "Hour",
    "Day_Of_Week_Numeric",
    "Covid_Outbreak",
    "Month",
    "Season",
]


def design(frame: pd.DataFrame, terms: list[str] = TERMS) -> pd.DataFrame:
    """R's ``model.matrix`` for the formula ``Robbery ~ terms`` (treatment contrasts, intercept
    first, factor levels alphabetical: Covid_Outbreak 0/1, Season Fall/Spring/Summer/Winter)."""
    cols = {"(Intercept)": np.ones(len(frame))}
    for term in terms:
        if term == "Covid_Outbreak":
            cols["Covid_Outbreak1"] = (frame[term] == "1").astype(float).to_numpy()
        elif term == "Season":
            for level in ("Spring", "Summer", "Winter"):  # Fall is the reference level
                cols[f"Season{level}"] = (frame[term] == level).astype(float).to_numpy()
        else:
            cols[term] = frame[term].astype(float).to_numpy()
    return pd.DataFrame(cols, index=frame.index)


def term_columns(terms: list[str]) -> dict[str, list[str]]:
    """Design-matrix column names owned by each term."""
    out = {}
    for term in terms:
        if term == "Covid_Outbreak":
            out[term] = ["Covid_Outbreak1"]
        elif term == "Season":
            out[term] = ["SeasonSpring", "SeasonSummer", "SeasonWinter"]
        else:
            out[term] = [term]
    return out


def _binomial_deviance(y: np.ndarray, mu: np.ndarray) -> float:
    """sum of binomial deviance residuals (R's ``binomial()$dev.resids``, unit weights)."""
    with np.errstate(divide="ignore", invalid="ignore"):
        d = 2.0 * (
            np.where(y > 0, y * np.log(y / mu), 0.0)
            + np.where(y < 1, (1 - y) * np.log((1 - y) / (1 - mu)), 0.0)
        )
    return float(np.sum(d))


@dataclass
class Fit:
    """A fitted binomial (logit) or Gaussian glm with the pieces the analysis reports.

    ``weights`` are the IRLS weights of the *last weighted least-squares fit*, as in R: the
    covariance matrix, hat values and influence measures are built from them, not from the
    weights at the final mean."""

    X: pd.DataFrame
    y: np.ndarray
    family: str
    params: pd.Series
    cov: pd.DataFrame
    mu: np.ndarray
    eta: np.ndarray
    weights: np.ndarray
    deviance: float
    iterations: int
    dispersion: float

    @property
    def n(self) -> int:
        return len(self.y)

    @property
    def edf(self) -> int:
        return self.X.shape[1]

    @property
    def df_resid(self) -> int:
        return self.n - self.edf

    @property
    def n_par(self) -> int:
        return self.edf + (1 if self.family == "gaussian" else 0)

    @property
    def loglik(self) -> float:
        if self.family == "binomial":
            with np.errstate(divide="ignore", invalid="ignore"):
                ll = np.where(self.y > 0, self.y * np.log(self.mu), 0.0) + np.where(
                    self.y < 1, (1 - self.y) * np.log(1 - self.mu), 0.0
                )
            return float(np.sum(ll))
        return float(-self.n / 2 * (np.log(2 * np.pi * self.deviance / self.n) + 1))

    @property
    def aic(self) -> float:
        return -2.0 * self.loglik + 2.0 * self.n_par

    def bic(self) -> float:
        return -2.0 * self.loglik + np.log(self.n) * self.n_par

    @property
    def resid_deviance(self) -> np.ndarray:
        with np.errstate(divide="ignore", invalid="ignore"):
            d = 2.0 * (
                np.where(self.y > 0, self.y * np.log(self.y / self.mu), 0.0)
                + np.where(self.y < 1, (1 - self.y) * np.log((1 - self.y) / (1 - self.mu)), 0.0)
            )
        return np.sign(self.y - self.mu) * np.sqrt(d)

    @property
    def resid_pearson(self) -> np.ndarray:
        return (self.y - self.mu) / np.sqrt(self.mu * (1 - self.mu))

    @property
    def resid_working(self) -> np.ndarray:
        return (self.y - self.mu) / (self.mu * (1 - self.mu))


def fit_glm(
    X: pd.DataFrame,
    y: np.ndarray,
    family: str = "binomial",
    epsilon: float = 1e-8,
    max_iter: int = 25,
) -> Fit:
    """R's ``glm.fit``: for the binomial logit family, IRLS from mustart = (y + 0.5) / 2 until
    |dev - devold| / (|dev| + 0.1) < epsilon; the Gaussian identity family is least squares."""
    y = np.asarray(y, dtype=float)
    A = X.to_numpy()
    cols = list(X.columns)
    if family == "gaussian":
        beta, *_ = np.linalg.lstsq(A, y, rcond=None)
        mu = A @ beta
        dev = float(np.sum((y - mu) ** 2))
        xtx_inv = np.linalg.inv(A.T @ A)
        disp = dev / (len(y) - A.shape[1])
        return Fit(
            X,
            y,
            family,
            pd.Series(beta, cols),
            pd.DataFrame(xtx_inv * disp, cols, cols),
            mu,
            mu,
            np.ones(len(y)),
            dev,
            1,
            disp,
        )
    mu = (y + 0.5) / 2.0
    eta = np.log(mu / (1.0 - mu))
    devold = _binomial_deviance(y, mu)
    for it in range(1, max_iter + 1):
        mu_eta = mu * (1.0 - mu)
        z = eta + (y - mu) / mu_eta
        w = mu_eta  # weights * mu.eta^2 / variance = mu(1 - mu) for the logit link
        sw = np.sqrt(w)
        beta, *_ = np.linalg.lstsq(A * sw[:, None], z * sw, rcond=None)
        eta = A @ beta
        mu = 1.0 / (1.0 + np.exp(-eta))
        dev = _binomial_deviance(y, mu)
        if abs(dev - devold) / (abs(dev) + 0.1) < epsilon:
            break
        devold = dev
    xtx_inv = np.linalg.inv((A * w[:, None]).T @ A)
    return Fit(
        X,
        y,
        family,
        pd.Series(beta, cols),
        pd.DataFrame(xtx_inv, cols, cols),
        mu,
        eta,
        w,
        dev,
        it,
        1.0,
    )


def summary_table(fit: Fit) -> pd.DataFrame:
    """R's ``summary(glm)`` coefficient table (z for binomial, t for Gaussian)."""
    se = pd.Series(np.sqrt(np.diag(fit.cov.to_numpy())), fit.params.index)
    stat = fit.params / se
    if fit.family == "binomial":
        p = 2 * stats.norm.sf(np.abs(stat))
        names = ["Estimate", "Std. Error", "z value", "Pr(>|z|)"]
    else:
        p = 2 * stats.t.sf(np.abs(stat), fit.df_resid)
        names = ["Estimate", "Std. Error", "t value", "Pr(>|t|)"]
    return pd.DataFrame({names[0]: fit.params, names[1]: se, names[2]: stat, names[3]: p})


def gvif(fit: Fit, terms: list[str]) -> pd.DataFrame:
    """``car::vif``: GVIF = det(R_term) det(R_rest) / det(R) on the coefficient correlation
    matrix without the intercept; the third column is GVIF^(1/(2 Df))."""
    cov = fit.cov.drop(index="(Intercept)", columns="(Intercept)")
    sd = np.sqrt(np.diag(cov.to_numpy()))
    corr = pd.DataFrame(cov.to_numpy() / np.outer(sd, sd), index=cov.index, columns=cov.columns)
    rows = []
    for term, cols in term_columns(terms).items():
        rest = [c for c in corr.columns if c not in cols]
        value = (
            np.linalg.det(corr.loc[cols, cols])
            * np.linalg.det(corr.loc[rest, rest])
            / np.linalg.det(corr)
        )
        rows.append((term, value, len(cols), value ** (1 / (2 * len(cols)))))
    return pd.DataFrame(rows, columns=["term", "GVIF", "Df", "GVIF^(1/(2*Df))"])


def _criterion(frame: pd.DataFrame, y: np.ndarray, terms: list[str], k: float) -> float:
    """``extractAIC.glm``: deviance + k * edf for the binomial family (aic + (k - 2) edf)."""
    fit = fit_glm(design(frame, terms), y)
    return fit.aic - 2.0 * fit.n_par + k * fit.n_par


def stepwise(frame: pd.DataFrame, y: np.ndarray, k: float) -> tuple[list[str], list[dict]]:
    """``step(model, k = k, direction = "both")`` starting from the full model; the scope is the
    full model (upper) and the intercept-only model (lower). Returns terms and the path."""
    current = list(TERMS)
    score = _criterion(frame, y, current, k)
    path = [{"step": "", "criterion": score}]
    while True:
        candidates = {}
        for t in current:
            candidates[f"- {t}"] = [u for u in current if u != t]
        for t in TERMS:
            if t not in current:
                candidates[f"+ {t}"] = [u for u in TERMS if u in current or u == t]
        if not candidates:
            break
        scores = {name: _criterion(frame, y, terms, k) for name, terms in candidates.items()}
        best = min(scores, key=scores.get)
        if scores[best] >= score - 1e-7:
            break
        current, score = candidates[best], scores[best]
        path.append({"step": best, "criterion": score})
    return current, path


def lr_test(small: Fit, big: Fit) -> dict:
    """``lmtest::lrtest(small, big)`` for nested glms."""
    chisq = 2 * (big.loglik - small.loglik)
    df = big.edf - small.edf
    return {
        "loglik_small": small.loglik,
        "loglik_big": big.loglik,
        "df": df,
        "chisq": chisq,
        "p": float(stats.chi2.sf(chisq, df)),
    }


def influence(fit: Fit) -> dict[str, np.ndarray]:
    """glm influence measures as R computes them for a binomial glm.

    ``lm.influence`` runs on the design weighted by the last IRLS weights, taking the deviance
    residuals as the weighted residuals: hat values, leave-one-out coefficient changes and
    sigma_(i). DFBETAS and DFFITS scale those; Cook's distance uses Pearson residuals."""
    X = fit.X.to_numpy()
    n, p = X.shape
    sw = np.sqrt(fit.weights)
    Xw = X * sw[:, None]
    xtx_inv = np.linalg.inv(Xw.T @ Xw)
    hat = np.einsum("ij,jk,ik->i", Xw, xtx_inv, Xw)
    dev = fit.resid_deviance
    denom = 1.0 - hat
    sigma = np.sqrt((np.sum(dev**2) - dev**2 / denom) / (n - p - 1))
    dfbeta = (Xw @ xtx_inv) * (dev / denom)[:, None]
    dfbetas = dfbeta / (sigma[:, None] * np.sqrt(np.diag(xtx_inv))[None, :])
    dffits = dev * np.sqrt(hat) / (sigma * denom)
    cooks = (fit.resid_pearson / denom) ** 2 * hat / p  # dispersion is 1 for the binomial family
    return {
        "hat": hat,
        "dfbetas": dfbetas,
        "dffits": dffits,
        "cooks": cooks,
        "working_resid": fit.resid_working,
        "sigma_i": sigma,
    }


# --- ROC, lrm statistics, calibration -----------------------------------------------------------


def fitted_probability(fit: Fit) -> np.ndarray:
    return fit.mu


def auc(y: np.ndarray, score: np.ndarray) -> float:
    """Mann-Whitney AUC with ties counted half (what ``pROC::auc`` returns, direction "<")."""
    ranks = stats.rankdata(score)
    n1 = float(np.sum(y == 1))
    n0 = len(y) - n1
    return float((ranks[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def roc_curve(y: np.ndarray, score: np.ndarray) -> pd.DataFrame:
    """``pROC::roc`` coordinates: thresholds are midpoints of consecutive distinct scores plus
    -Inf and Inf; sensitivity = P(score > t | case), specificity = P(score <= t | control)."""
    values, inverse = np.unique(score, return_inverse=True)
    cases = np.bincount(inverse, weights=(y == 1).astype(float), minlength=len(values))
    controls = np.bincount(inverse, weights=(y == 0).astype(float), minlength=len(values))
    thresholds = np.concatenate([[-np.inf], (values[1:] + values[:-1]) / 2, [np.inf]])
    cum_cases = np.concatenate([[0.0], np.cumsum(cases)])
    cum_controls = np.concatenate([[0.0], np.cumsum(controls)])
    return pd.DataFrame(
        {
            "threshold": thresholds,
            "sensitivity": 1.0 - cum_cases / cases.sum(),
            "specificity": cum_controls / controls.sum(),
        }
    )


def lrm_stats(fit: Fit) -> dict[str, float]:
    """The ``lrm`` statistics that follow from the fit: model L.R., C, Dxy, Nagelkerke R2,
    Brier score and the Gini mean difference g of the linear predictor."""
    y, p, n = fit.y, fit.mu, fit.n
    null_ll = float(y.sum() * np.log(y.mean()) + (n - y.sum()) * np.log(1 - y.mean()))
    lr = 2.0 * (fit.loglik - null_ll)
    c_index = auc(y, p)
    lp = fit.eta
    order = np.sort(lp)
    i = np.arange(1, n + 1)
    g = float(np.sum((2 * i - n - 1) * order) * 2.0 / (n * (n - 1)))  # mean |lp_i - lp_j|
    return {
        "Model L.R.": lr,
        "d.f.": float(fit.edf - 1),
        "C": c_index,
        "Dxy": 2.0 * (c_index - 0.5),
        "R2": (1 - np.exp(-lr / n)) / (1 - np.exp(2 * null_ll / n)),
        "Brier": float(np.mean((p - y) ** 2)),
        "g": g,
        "gr": float(np.exp(g)),
    }


def lowess_at(x: np.ndarray, y: np.ndarray, grid: np.ndarray) -> np.ndarray:
    """R's ``lowess(x, y, iter = 0)`` (f = 2/3, delta = 0.01 * range) evaluated on ``grid`` by
    linear interpolation, as ``rms::calibrate`` does; NaN outside the range of ``x``."""
    from statsmodels.nonparametric.smoothers_lowess import lowess

    sm_curve = lowess(y, x, frac=2.0 / 3.0, it=0, delta=0.01 * float(np.ptp(x)), return_sorted=True)
    xs, ys = sm_curve[:, 0], sm_curve[:, 1]
    # interpolation needs distinct abscissae: average duplicates the way approx(ties = mean) does
    ux, idx = np.unique(xs, return_index=True)
    uy = np.add.reduceat(ys, idx) / np.diff(np.append(idx, len(xs)))
    out = np.interp(grid, ux, uy)
    out[(grid < ux[0]) | (grid > ux[-1])] = np.nan
    return out


def calibration(
    frame: pd.DataFrame,
    y: np.ndarray,
    terms: list[str],
    groups: int = 10,
    seed: int = 0,
    grid_points: int = 50,
) -> pd.DataFrame:
    """Port of ``rms::calibrate(lrm, method = "crossvalidation", B = 10)``.

    The grid is ``grid_points`` equally spaced values from the smallest to the largest fitted
    probability. The apparent curve is exact; the cross-validated optimism uses folds drawn
    here (rms's internal fold draw cannot be replayed), so the bias-corrected curve matches R
    only to within sampling noise of the fold assignment."""
    X = design(frame, terms)
    fit = fit_glm(X, y)
    p = fit.mu
    grid = np.linspace(p.min(), p.max(), grid_points)
    orig = lowess_at(p, y, grid)
    rng = np.random.default_rng(seed)
    fold = rng.permutation(np.arange(len(y)) % groups)
    training, test = [], []
    for k in range(groups):
        tr, te = fold != k, fold == k
        sub = fit_glm(X[tr], y[tr])
        p_tr = sub.mu
        p_te = 1.0 / (1.0 + np.exp(-(X[te].to_numpy() @ sub.params.to_numpy())))
        training.append(lowess_at(p_tr, y[tr], grid) - grid)
        test.append(lowess_at(p_te, y[te], grid) - grid)
    training, test = np.array(training), np.array(test)
    optimism = np.nanmean(training - test, axis=0)
    corrected = orig - optimism
    return pd.DataFrame(
        {
            "predy": grid,
            "calibrated.orig": orig,
            "calibrated.corrected": corrected,
            "index.orig": orig - grid,
            "optimism": optimism,
            "index.corrected": orig - grid - optimism,
        }
    )


def calibration_errors(fit: Fit, curve: pd.DataFrame) -> dict[str, float]:
    """The printed stats of ``print(calibrate(...))``: errors between each observation's
    predicted probability and the bias-corrected curve at that prediction."""
    ok = curve["calibrated.corrected"].notna().to_numpy()
    est = np.interp(fit.mu, curve["predy"][ok], curve["calibrated.corrected"][ok])
    err = np.abs(fit.mu - est)
    return {
        "n": fit.n,
        "mean_abs_error": float(err.mean()),
        "mean_squared_error": float(np.mean(err**2)),
        "q90_abs_error": float(np.quantile(err, 0.9)),
    }


def lasso_matrix(frame: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
    """The LASSO design of the Rmd: ``model.matrix(~ ... - 1)`` gives Covid_Outbreak both dummies
    (no intercept column) and Season treatment-coded."""
    cols = {
        "Presence_of_Sunset": frame["Presence_of_Sunset"].astype(float),
        "Hour": frame["Hour"].astype(float),
        "Day_Of_Week_Numeric": frame["Day_Of_Week_Numeric"].astype(float),
        "Covid_Outbreak0": (frame["Covid_Outbreak"] == "0").astype(float),
        "Covid_Outbreak1": (frame["Covid_Outbreak"] == "1").astype(float),
        "Month": frame["Month"].astype(float),
        "SeasonSpring": (frame["Season"] == "Spring").astype(float),
        "SeasonSummer": (frame["Season"] == "Summer").astype(float),
        "SeasonWinter": (frame["Season"] == "Winter").astype(float),
    }
    return np.column_stack(list(cols.values())), list(cols)
