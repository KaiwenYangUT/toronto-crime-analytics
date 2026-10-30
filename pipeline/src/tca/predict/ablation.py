"""The ablation ladder: what does each feature group add for telling a robbery from other major
property crime?  PLAN.md section 5.2.

Rows are identical for every rung (unified table, 2014-2023, NSA dropped, census-joined). Rungs:
L0 prevalence, L1 time, L2 + location and premises, L3 + census (all logistic), L4 random forest
and L5 XGBoost on the L3 features; L2 to L5 are rerun without premises and location type.
Two evaluation designs: A, neighbourhood-grouped 5-fold CV; B, temporal holdout (train <= 2021,
test 2022-2023). Everything fitted (scalers, level lists, spline knots, hyperparameters and the
decision threshold) is fitted inside the training part of a fold only.
"""

from __future__ import annotations

import hashlib
import inspect
import json
import time
from dataclasses import dataclass
from itertools import product
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import SplineTransformer, StandardScaler
from xgboost import XGBClassifier

from tca.build import jsc370_census, unified
from tca.definitions import NSA, SEED
from tca.features import solar_darkness
from tca.io import ROOT

CACHE = ROOT / "data" / "interim" / "ablation"
CENSUS = [
    "Individual_Median_Income", "Individual_Average_Income", "Population", "Average_Household_Size",
    "Number_of_Rental_Properties", "Permanent_Job_and_Labour_Force_Ratio",
    "Transportation_Service_Worker_and_Population_Ratio", "HealthCare_Service_Worker_and_Population_Ratio",
    "Difference_in_Individual_Median_Average_Income",
]  # fmt: skip
RUNGS = {  # rung -> (model kind, blocks)
    "L1": ("logistic", ("time",)),
    "L2": ("logistic", ("time", "geo", "premises")),
    "L3": ("logistic", ("time", "geo", "premises", "census")),
    "L4": ("forest", ("time", "geo", "premises", "census")),
    "L5": ("xgboost", ("time", "geo", "premises", "census")),
}
TEST_YEARS = (2022, 2023)


def build_table(fraction: float = 1.0) -> tuple[pd.DataFrame, dict]:
    """Model rows with every raw feature, plus a log of what was dropped. ``fraction`` < 1 keeps a
    seeded random share of the *neighbourhoods* (used to time the full run on a small sample)."""
    df, _ = unified()
    log = {"unified_rows": len(df)}
    df = df[df["neighbourhood"] != NSA]
    log["nsa_dropped"] = log["unified_rows"] - len(df)
    census = jsc370_census()[["Neighbourhood", *CENSUS]].rename(
        columns={"Neighbourhood": "neighbourhood"}
    )
    before = len(df)
    df = df.merge(census, on="neighbourhood", how="inner", validate="many_to_one")
    log["no_census_match_dropped"] = before - len(df)
    df["dark"], _ = solar_darkness(df["date"], df["hour"])
    df = df.reset_index(drop=True)
    if fraction < 1.0:
        rng = np.random.default_rng(SEED)
        hoods = np.array(sorted(df["neighbourhood"].unique()))
        keep = set(rng.choice(hoods, size=max(5, int(len(hoods) * fraction)), replace=False))
        df = df[df["neighbourhood"].isin(keep)].reset_index(drop=True)
    log["model_rows"] = len(df)
    log["neighbourhoods"] = int(df["neighbourhood"].nunique())
    return df, log


@dataclass
class FeatureBuilder:
    """Turns raw rows into model columns. ``fit`` learns scalers, spline knots and level lists on
    training rows only; ``transform`` applies them to any rows. ``blocks_of_columns`` maps each
    output column to its block for grouped permutation importance."""

    blocks: tuple[str, ...]
    min_level_share: float = 0.01

    def fit(self, df: pd.DataFrame) -> FeatureBuilder:
        self.levels_: dict[str, list[str]] = {}
        if "premises" in self.blocks:
            for col in ("premises_type", "location_type"):
                share = df[col].value_counts(normalize=True)
                self.levels_[col] = sorted(share[share >= self.min_level_share].index)
        if "geo" in self.blocks:
            self.spline_ = SplineTransformer(n_knots=5, degree=3, extrapolation="constant").fit(
                df[["longitude", "latitude"]].to_numpy()
            )
        numeric = self._numeric(df)
        self.scaler_ = StandardScaler().fit(numeric) if numeric.shape[1] else None
        return self

    def _numeric(self, df: pd.DataFrame) -> np.ndarray:
        parts, names, blocks = [], [], []

        def add(arr, name, block):
            arr = np.asarray(arr, dtype=float).reshape(len(df), -1)
            parts.append(arr)
            names.extend(f"{name}{i}" if arr.shape[1] > 1 else name for i in range(arr.shape[1]))
            blocks.extend([block] * arr.shape[1])

        if "time" in self.blocks:
            for k in (1, 2, 3):
                add(np.cos(2 * np.pi * k * df["hour"] / 24), f"hour_cos{k}", "time")
                add(np.sin(2 * np.pi * k * df["hour"] / 24), f"hour_sin{k}", "time")
            for k in (1, 2):
                add(np.cos(2 * np.pi * k * (df["month"] - 1) / 12), f"month_cos{k}", "time")
                add(np.sin(2 * np.pi * k * (df["month"] - 1) / 12), f"month_sin{k}", "time")
            add(df["dark"], "dark", "time")
        if "geo" in self.blocks:
            add(self.spline_.transform(df[["longitude", "latitude"]].to_numpy()), "geo", "geo")
        if "census" in self.blocks:
            for c in CENSUS:
                add(df[c], c, "census")
        self._numeric_names, self._numeric_blocks = names, blocks
        return np.hstack(parts) if parts else np.empty((len(df), 0))

    def _categorical(self, df: pd.DataFrame) -> tuple[np.ndarray, list[str]]:
        cols, names = [], []
        if "time" in self.blocks:
            for d in range(1, 8):
                cols.append((df["weekday"] == d).to_numpy(dtype=float))
                names.append(f"weekday={d}")
        for col, levels in self.levels_.items():
            value = df[col].where(df[col].isin(levels), "other")
            for lvl in [*levels, "other"]:
                cols.append((value == lvl).to_numpy(dtype=float))
                names.append(f"{col}={lvl}")
        return (np.column_stack(cols) if cols else np.empty((len(df), 0))), names

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        numeric = self._numeric(df)
        scaled = self.scaler_.transform(numeric) if self.scaler_ is not None else numeric
        cat, cat_names = self._categorical(df)
        self.columns_ = self._numeric_names + cat_names
        self.blocks_of_columns_ = self._numeric_blocks + [
            "time" if n.startswith("weekday=") else "premises" for n in cat_names
        ]
        return np.hstack([scaled, cat])


# --- models ---------------------------------------------------------------------------------------

GRIDS = {
    "logistic": [{"C": c} for c in (0.01, 0.1, 1.0)],
    "forest": [
        {"min_samples_leaf": a, "max_features": b} for a, b in product((5, 20), ("sqrt", 0.3))
    ],
    "xgboost": [
        {"max_depth": d, "learning_rate": lr, "min_child_weight": m}
        for d, lr, m in product((3, 5), (0.05, 0.1), (1, 10))
    ],
}


def make_model(kind: str, params: dict, n_estimators: int | None = None, n_jobs: int = 4):
    if kind == "logistic":
        return LogisticRegression(C=params["C"], max_iter=1000, random_state=SEED)
    if kind == "forest":
        return RandomForestClassifier(
            n_estimators=300,
            max_samples=0.5,
            min_samples_leaf=params["min_samples_leaf"],
            max_features=params["max_features"],
            n_jobs=n_jobs,
            random_state=SEED,
        )
    return XGBClassifier(
        n_estimators=n_estimators or 500,
        max_depth=params["max_depth"],
        learning_rate=params["learning_rate"],
        min_child_weight=params["min_child_weight"],
        subsample=0.8,
        colsample_bytree=0.8,
        tree_method="hist",
        early_stopping_rounds=30 if n_estimators is None else None,
        eval_metric="logloss",
        n_jobs=n_jobs,
        random_state=SEED,
    )


def best_f1_threshold(y: np.ndarray, p: np.ndarray) -> float:
    """The probability cut-off that maximises F1 on the given (out-of-fold) predictions."""
    order = np.argsort(-p, kind="stable")
    ys, ps = y[order], p[order]
    tp = np.cumsum(ys)
    k = np.arange(1, len(ys) + 1)
    f1 = 2 * tp / (k + ys.sum())
    last_of_tie = np.append(ps[1:] != ps[:-1], True)  # only cut between distinct scores
    f1 = np.where(last_of_tie, f1, -1.0)
    return float(ps[int(np.argmax(f1))])


def fit_predict(kind: str, params: dict, Xtr, ytr, Xte, n_estimators=None, Xval=None, yval=None):
    model = make_model(kind, params, n_estimators)
    if kind == "xgboost" and n_estimators is None:
        model.fit(Xtr, ytr, eval_set=[(Xval, yval)], verbose=False)
        return model, model.predict_proba(Xte)[:, 1], int(model.best_iteration) + 1
    model.fit(Xtr, ytr)
    if kind == "forest":
        # trees are built in parallel (each has its own seed), but summing their votes across
        # threads is order-dependent in the last digits; predict on one thread to stay reproducible
        model.set_params(n_jobs=1)
    return model, model.predict_proba(Xte)[:, 1], None


def inner_splits(train: pd.DataFrame, folds: int = 3) -> list[tuple[np.ndarray, np.ndarray]]:
    """Grouped (by neighbourhood) stratified folds inside a training part, for tuning."""
    return list(
        StratifiedGroupKFold(folds, shuffle=True, random_state=SEED).split(
            train, train["robbery"].to_numpy(), train["neighbourhood"].to_numpy()
        )
    )


def outer_splits(
    design: str, table: pd.DataFrame, outer_folds: int = 5
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Train/test row positions: "A" neighbourhood-grouped k-fold, "B" train <= 2021, test 2022-2023."""
    if design == "A":
        return list(
            StratifiedGroupKFold(outer_folds, shuffle=True, random_state=SEED).split(
                table, table["robbery"].to_numpy(), table["neighbourhood"].to_numpy()
            )
        )
    in_test = table["year"].isin(TEST_YEARS).to_numpy()
    return [(np.flatnonzero(~in_test), np.flatnonzero(in_test))]


def tune_and_fit(
    kind: str,
    blocks: tuple[str, ...],
    train: pd.DataFrame,
    test: pd.DataFrame,
    inner_folds: int = 3,
):
    """Hyperparameters, threshold and final fit from the training rows alone.

    Inner grouped CV (by neighbourhood) scores each grid point by PR-AUC; the F1-optimal threshold
    comes from the inner out-of-fold predictions of the chosen point and is then applied to the
    held-out rows. Returns (test probabilities, threshold, fitted model, fitted builder, chosen)."""
    y = train["robbery"].to_numpy()
    groups = train["neighbourhood"].to_numpy()
    inner = list(
        StratifiedGroupKFold(inner_folds, shuffle=True, random_state=SEED).split(train, y, groups)
    )
    grid = GRIDS[kind]
    scores, oof_by_point, iters = [], [], []
    for params in grid:
        oof = np.zeros(len(train))
        best_iters = []
        for tr, va in inner:
            fb = FeatureBuilder(blocks).fit(train.iloc[tr])
            Xtr, Xva = fb.transform(train.iloc[tr]), fb.transform(train.iloc[va])
            _, p, it = fit_predict(kind, params, Xtr, y[tr], Xva, Xval=Xva, yval=y[va])
            oof[va] = p
            if it:
                best_iters.append(it)
        scores.append(average_precision_score(y, oof))
        oof_by_point.append(oof)
        iters.append(int(np.mean(best_iters) * 1.1) if best_iters else None)
    k = int(np.argmax(scores))
    threshold = best_f1_threshold(y, oof_by_point[k])
    fb = FeatureBuilder(blocks).fit(train)
    Xtr, Xte = fb.transform(train), fb.transform(test)
    model, p, _ = fit_predict(kind, grid[k], Xtr, y, Xte, n_estimators=iters[k])
    chosen = {
        **grid[k],
        "inner_pr_auc": float(scores[k]),
        **({"n_estimators": iters[k]} if iters[k] else {}),
    }
    return p, threshold, model, fb, chosen


# --- evaluation designs ---------------------------------------------------------------------------


def run_design(
    design: str, variant: str, table: pd.DataFrame, outer_folds: int = 5, importance: bool = False
):
    """Predictions for one rung under design "A" (grouped CV) or "B" (temporal holdout).

    ``variant`` is a rung name, optionally ``-nopremises``. Returns (prediction frame, info)."""
    rung = variant.split("-")[0]
    kind, blocks = RUNGS[rung]
    if variant.endswith("-nopremises"):
        blocks = tuple(b for b in blocks if b != "premises")
    y = table["robbery"].to_numpy()
    splits = outer_splits(design, table, outer_folds)
    out, info, imp = [], [], []
    started = time.time()
    for fold, (tr, te) in enumerate(splits):
        train, test = table.iloc[tr], table.iloc[te]
        p, thr, model, fb, chosen = tune_and_fit(kind, blocks, train, test)
        out.append(pd.DataFrame({"row": te, "fold": fold, "y": y[te], "p": p, "threshold": thr}))
        info.append(
            {"fold": fold, "train_rows": len(tr), "test_rows": len(te), "threshold": thr, **chosen}
        )
        if importance and kind == "xgboost":
            imp.append(permutation_importance(model, fb, test))
    return pd.concat(out, ignore_index=True), {
        "folds": info,
        "seconds": round(time.time() - started, 1),
        "importance": imp,
    }


def permutation_importance(model, fb: FeatureBuilder, test: pd.DataFrame, repeats: int = 3) -> dict:
    """Drop in PR-AUC on held-out rows when one whole feature block is shuffled (rows permuted
    jointly within the block, so a block's internal structure is kept), averaged over repeats."""
    from sklearn.metrics import average_precision_score as ap

    X = fb.transform(test)
    y = test["robbery"].to_numpy()
    base = ap(y, model.predict_proba(X)[:, 1])
    blocks = np.array(fb.blocks_of_columns_)
    rng = np.random.default_rng(SEED)
    out = {}
    Xp = X.copy()
    for block in sorted(set(blocks)):
        cols = np.flatnonzero(blocks == block)
        drops = []
        for _ in range(repeats):
            Xp[:, cols] = X[np.ix_(rng.permutation(len(X)), cols)]  # only the block's columns move
            drops.append(base - ap(y, model.predict_proba(Xp)[:, 1]))
        Xp[:, cols] = X[:, cols]
        out[block] = float(np.mean(drops))
    return out


def signature(design: str, variant: str, table: pd.DataFrame) -> str:
    """Fingerprint of everything a cached prediction depends on: the rows, the design, the grids
    and settings, the library versions and the source of the fitting code."""
    import sklearn
    import xgboost

    parts = {
        "design": design,
        "variant": variant,
        "seed": SEED,
        "test_years": TEST_YEARS,
        "grids": GRIDS,
        "rungs": RUNGS,
        "census": CENSUS,
        "sklearn": sklearn.__version__,
        "xgboost": xgboost.__version__,
        "table": int(pd.util.hash_pandas_object(table, index=True).sum()),
        "code": [
            inspect.getsource(o)
            for o in (
                FeatureBuilder,
                make_model,
                fit_predict,
                tune_and_fit,
                best_f1_threshold,
                inner_splits,
                outer_splits,
                run_design,
            )
        ],
    }
    return hashlib.sha256(json.dumps(parts, sort_keys=True, default=str).encode()).hexdigest()


def cached(
    design: str, variant: str, table: pd.DataFrame, tag: str = "full", force: bool = False, **kw
):
    """Run or load one (design, variant); predictions live in data/interim/ablation as parquet.
    A cache made by different rows, settings, library versions or fitting code is recomputed."""
    CACHE.mkdir(parents=True, exist_ok=True)
    path: Path = CACHE / f"{tag}_{design}_{variant}.parquet"
    info_path = path.with_suffix(".json")
    sig = signature(design, variant, table)
    if path.exists() and info_path.exists() and not force:
        info = json.loads(info_path.read_text())
        if info.get("signature") == sig:
            return pd.read_parquet(path), info
    preds, info = run_design(design, variant, table, **kw)
    info["signature"] = sig
    preds.to_parquet(path)
    info_path.write_text(json.dumps(info, indent=1))
    return preds, info
