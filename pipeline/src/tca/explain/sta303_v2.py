"""STA303 v2: the inference model after the improvements in PLAN.md section 5.1.

Question: among reported major property-type incidents, how does the odds of an incident being a
robbery (rather than an auto theft, break and enter or theft over) differ by hour, month,
weekday, darkness and the period after 2019? It describes P(robbery | reported MCI incident),
not the risk of being robbed, and the post-2019 term is a period indicator, not a COVID effect.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.model_selection import StratifiedKFold

from tca.build import unified
from tca.definitions import NSA, SEED
from tca.explain.sta303_port import Fit, auc, fit_glm
from tca.features import solar_darkness
from tca.predict.jsc370_port import independent_columns
from tca.results import write_result

REF_HOUR, REF_MONTH, REF_WEEKDAY = 12, 1, 1
INPUTS = [
    "Auto_Theft_Open_Data.csv", "Break_and_Enter_Open_Data.csv", "Robbery_Open_Data.csv",
    "Theft_Over_Open_Data.csv",
]  # fmt: skip
NEGATIVES = ["Auto Theft", "Break and Enter", "Theft Over"]


def prepare() -> tuple[pd.DataFrame, dict]:
    """The model table (unified rows, NSA dropped, solar darkness) and a log of every exclusion."""
    df, ledger = unified()
    steps = {s["step"]: s["rows"] for s in ledger["steps"]}
    source_rows = ledger["steps"][0]["rows"]
    outside_window = (
        source_rows - steps[next(k for k in steps if k.startswith("valid calendar date"))]
    )
    n_before = len(df)
    df = df[df["neighbourhood"] != NSA].copy()
    dark, dst = solar_darkness(df["date"], df["hour"])
    df["dark"] = dark
    df["post2019"] = (df["year"] >= 2020).astype("int8")
    log = {
        "source_rows": source_rows,
        "rows_outside_2014_2023_or_invalid_date": outside_window,
        "ledger_final_rows": n_before,
        "nsa_rows_dropped": n_before - len(df),
        "cross_category_conflict_events_dropped": ledger["cross_category"][
            "events_with_robbery_and_other"
        ],
        "model_rows": len(df),
        "neighbourhoods": int(df["neighbourhood"].nunique()),
        **dst,
    }
    return df, log


def design(df: pd.DataFrame, harmonic: bool = False) -> pd.DataFrame:
    """Hour (24 levels, reference 12:00) and month (12 levels, reference January) as factors,
    weekday (reference Monday), post-2019 period and solar darkness. ``harmonic`` swaps the hour
    and month factors for cosine/sine terms (hour k = 1-3, month k = 1-2)."""
    cols: dict[str, np.ndarray] = {"(Intercept)": np.ones(len(df))}
    if harmonic:
        for k in (1, 2, 3):
            cols[f"hour_cos{k}"] = np.cos(2 * np.pi * k * df["hour"] / 24).to_numpy()
            cols[f"hour_sin{k}"] = np.sin(2 * np.pi * k * df["hour"] / 24).to_numpy()
        for k in (1, 2):
            cols[f"month_cos{k}"] = np.cos(2 * np.pi * k * (df["month"] - 1) / 12).to_numpy()
            cols[f"month_sin{k}"] = np.sin(2 * np.pi * k * (df["month"] - 1) / 12).to_numpy()
    else:
        for h in range(24):
            if h != REF_HOUR:
                cols[f"hour={h:02d}"] = (df["hour"] == h).astype(float).to_numpy()
        for m in range(1, 13):
            if m != REF_MONTH:
                cols[f"month={m:02d}"] = (df["month"] == m).astype(float).to_numpy()
    for d in range(1, 8):
        if d != REF_WEEKDAY:
            cols[f"weekday={d}"] = (df["weekday"] == d).astype(float).to_numpy()
    cols["post2019"] = df["post2019"].astype(float).to_numpy()
    cols["dark"] = df["dark"].astype(float).to_numpy()
    return pd.DataFrame(cols, index=df.index)


def cluster_cov(fit: Fit, groups: np.ndarray) -> np.ndarray:
    """Sandwich covariance with clusters (neighbourhoods) and the usual small-sample factor
    G/(G-1) * (N-1)/(N-K)."""
    X = fit.X.to_numpy()
    score = X * (fit.y - fit.mu)[:, None]
    codes, unique = pd.factorize(groups)
    sums = np.zeros((len(unique), X.shape[1]))
    np.add.at(sums, codes, score)
    meat = sums.T @ sums
    bread = fit.cov.to_numpy()
    g, n, k = len(unique), len(fit.y), X.shape[1]
    return (g / (g - 1)) * ((n - 1) / (n - k)) * bread @ meat @ bread


def coefficient_table(fit: Fit, groups: np.ndarray) -> pd.DataFrame:
    """Coefficients with odds ratios and 95% intervals, standard and cluster-robust."""
    se = np.sqrt(np.diag(fit.cov.to_numpy()))
    rse = np.sqrt(np.diag(cluster_cov(fit, groups)))
    z = stats.norm.ppf(0.975)
    b = fit.params.to_numpy()
    out = pd.DataFrame(
        {
            "coef": b,
            "se": se,
            "robust_se": rse,
            "or": np.exp(b),
            "or_lo": np.exp(b - z * se),
            "or_hi": np.exp(b + z * se),
            "robust_or_lo": np.exp(b - z * rse),
            "robust_or_hi": np.exp(b + z * rse),
            "p": 2 * stats.norm.sf(np.abs(b / se)),
            "robust_p": 2 * stats.norm.sf(np.abs(b / rse)),
        },
        index=fit.params.index,
    )
    return out


def fit_model(df: pd.DataFrame, harmonic: bool = False) -> Fit:
    X = design(df, harmonic)
    kept = independent_columns(X)
    if len(kept) != X.shape[1]:
        raise ValueError(f"aliased design columns: {sorted(set(X.columns) - set(kept))}")
    return fit_glm(X, df["robbery"].to_numpy(dtype=float), epsilon=1e-12, max_iter=50)


def cross_validated(df: pd.DataFrame, folds: int = 5) -> tuple[dict, pd.DataFrame]:
    """Seeded stratified k-fold: AUC per fold and a decile calibration table on pooled
    out-of-fold predictions."""
    X = design(df)
    y = df["robbery"].to_numpy(dtype=float)
    oof = np.zeros(len(df))
    aucs = []
    for tr, te in StratifiedKFold(folds, shuffle=True, random_state=SEED).split(X, y):
        fit = fit_glm(X.iloc[tr], y[tr], epsilon=1e-10, max_iter=50)
        oof[te] = 1.0 / (1.0 + np.exp(-(X.iloc[te].to_numpy() @ fit.params.to_numpy())))
        aucs.append(auc(y[te], oof[te]))
    bins = pd.qcut(oof, 10, duplicates="drop")
    cal = (
        pd.DataFrame({"bin": bins, "p": oof, "y": y})
        .groupby("bin", observed=True)
        .agg(mean_predicted=("p", "mean"), observed=("y", "mean"), n=("y", "size"))
        .reset_index(drop=True)
    )
    return {
        "auc_folds": aucs,
        "auc_mean": float(np.mean(aucs)),
        "auc_sd": float(np.std(aucs, ddof=1)),
        "auc_pooled": auc(y, oof),
        "folds": folds,
        "seed": SEED,
    }, cal


def pick(table: pd.DataFrame, term: str) -> dict:
    r = table.loc[term]
    return {
        k: float(r[k])
        for k in ("or", "or_lo", "or_hi", "robust_or_lo", "robust_or_hi", "p", "robust_p")
    }


def run(write: bool = True) -> dict:
    df, log = prepare()
    groups = df["neighbourhood"].to_numpy()
    fit = fit_model(df)
    table = coefficient_table(fit, groups)
    harmonic = fit_model(df, harmonic=True)
    cv, cal = cross_validated(df)
    composition = {}
    for neg in NEGATIVES:
        sub = df[df["category"].isin(["Robbery", neg])]
        f = fit_model(sub)
        t = coefficient_table(f, sub["neighbourhood"].to_numpy())
        composition[neg] = {
            "n": len(sub),
            "robbery_share": float(sub["robbery"].mean()),
            "post2019": pick(t, "post2019"),
            "dark": pick(t, "dark"),
        }
    prevalence = df.groupby("year")["robbery"].agg(["mean", "size"])
    by_year = df.groupby(["year", "category"]).size().unstack(fill_value=0)
    values = {
        "task": "P(robbery | reported major property-type incident); association, not risk or causation",
        "log": log,
        "n": len(df),
        "robbery": int(df["robbery"].sum()),
        "robbery_share": float(df["robbery"].mean()),
        "classes": {c: int(v) for c, v in df["category"].value_counts().items()},
        "prevalence_by_year": {
            int(y): {"share": float(r["mean"]), "n": int(r["size"])}
            for y, r in prevalence.iterrows()
        },
        "category_by_year": {
            int(y): {c: int(r[c]) for c in by_year.columns} for y, r in by_year.iterrows()
        },
        "post2019": pick(table, "post2019"),
        "dark": pick(table, "dark"),
        "hour_or_vs_12": {h: pick(table, f"hour={h:02d}") for h in range(24) if h != REF_HOUR},
        "month_or_vs_jan": {m: pick(table, f"month={m:02d}") for m in range(2, 13)},
        "weekday_or_vs_mon": {d: pick(table, f"weekday={d}") for d in range(2, 8)},
        "fit": {
            "aic": fit.aic,
            "bic": fit.bic(),
            "loglik": fit.loglik,
            "deviance": fit.deviance,
            "null_deviance": float(
                -2 * np.sum(fit.y * np.log(fit.y.mean()) + (1 - fit.y) * np.log(1 - fit.y.mean()))
            ),
            "parameters": fit.n_par,
            "iterations": fit.iterations,
            "harmonic": {
                "aic": harmonic.aic,
                "bic": harmonic.bic(),
                "parameters": harmonic.n_par,
                "delta_aic": harmonic.aic - fit.aic,
                "delta_bic": harmonic.bic() - fit.bic(),
            },
        },
        "cv": cv,
        "calibration_deciles": cal.to_dict("records"),
        "composition": composition,
        "dark_identification": (
            "With hour and month as factors, darkness is identified only by twilight hours that are dark "
            "on some dates and light on others."
        ),
    }
    if write:
        write_result(
            "explain.sta303_v2",
            "explain",
            values,
            producer="tca.explain.sta303_v2",
            description="Inference model: odds of robbery vs other major property crime by hour, month, weekday, "
            "solar darkness and the post-2019 period, with cluster-robust intervals, CV AUC and composition check",
            formats={
                "post2019.or": {"decimals": 2},
                "post2019.or_lo": {"decimals": 2},
                "post2019.or_hi": {"decimals": 2},
                "post2019.robust_or_lo": {"decimals": 2},
                "post2019.robust_or_hi": {"decimals": 2},
                "dark.or": {"decimals": 2},
                "cv.auc_mean": {"decimals": 3},
                "cv.auc_sd": {"decimals": 3},
                "robbery_share": {"percent": True, "decimals": 1},
            },
            inputs=INPUTS,
        )
    return values


if __name__ == "__main__":
    v = run()
    print(v["log"])
    print("post2019", v["post2019"])
    print("dark", v["dark"])
    print("cv", {k: v["cv"][k] for k in ("auc_mean", "auc_sd", "auc_pooled")})
    print("fit", v["fit"]["aic"], v["fit"]["harmonic"])
    print({k: (round(c["post2019"]["or"], 3), c["n"]) for k, c in v["composition"].items()})
