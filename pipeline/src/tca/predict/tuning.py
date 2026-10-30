"""Python's own hyperparameter choice for the JSC370 models, selected by cross-validation on the
training frame only (the test frame is never used), reported as a separate labelled row next to
the R-hyperparameter fits."""

from __future__ import annotations

from itertools import product

import numpy as np
import pandas as pd
from joblib import Parallel, delayed
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier

from tca.definitions import SEED
from tca.predict import jsc370_port as j

# caret's default xgbTree grid for search = "grid" and tuneLength = 3: 3 x 3 x 2 x 2 x 3 = 108
XGB_GRID = {
    "nrounds": [50, 100, 150],
    "max_depth": [1, 2, 3],
    "eta": [0.3, 0.4],
    "colsample_bytree": [0.6, 0.8],
    "subsample": [0.5, 0.75, 1.0],
}


def _grid(spec: dict[str, list]) -> list[dict]:
    return [dict(zip(spec, values, strict=True)) for values in product(*spec.values())]


def _xgb(params: dict, seed: int, n_jobs: int = 1) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=int(params["nrounds"]),
        max_depth=int(params["max_depth"]),
        learning_rate=float(params["eta"]),
        gamma=0.0,
        colsample_bytree=float(params["colsample_bytree"]),
        min_child_weight=1.0,
        subsample=float(params["subsample"]),
        tree_method="exact",
        base_score=0.5,
        n_jobs=n_jobs,
        random_state=seed,
    )


def _cv_accuracy(params: dict, x: np.ndarray, y: np.ndarray, folds: int, seed: int) -> float:
    accs = []
    for tr, te in StratifiedKFold(folds, shuffle=True, random_state=seed).split(x, y):
        model = _xgb(params, seed).fit(x[tr], y[tr])
        accs.append(float((model.predict(x[te]) == y[te]).mean()))
    return float(np.mean(accs))


def tune_xgb(
    train: pd.DataFrame,
    test: pd.DataFrame,
    grid: dict | None = None,
    folds: int = 10,
    seed: int = SEED,
    n_jobs: int = 4,
) -> tuple[pd.DataFrame, dict]:
    """Grid search on caret's dummy design by CV accuracy (as caret ranks the grid)."""
    xtr, _ = j.caret_dummies(train, test)
    x, y = xtr.to_numpy(), train["Robbery"].astype(int).to_numpy()
    combos = _grid(grid or XGB_GRID)
    scores = Parallel(n_jobs=n_jobs)(delayed(_cv_accuracy)(p, x, y, folds, seed) for p in combos)
    table = (
        pd.DataFrame(combos)
        .assign(accuracy=scores)
        .sort_values("accuracy", ascending=False, kind="stable")
    )
    return table.reset_index(drop=True), dict(table.iloc[0].drop("accuracy"))


def tune_forest_mtry(
    train: pd.DataFrame,
    test: pd.DataFrame,
    candidates: list[int] | None = None,
    ntree: int = 500,
    seed: int = SEED,
) -> tuple[pd.DataFrame, int]:
    """Choose mtry by out-of-bag accuracy of a 500-tree forest."""
    xtr, _ = j.alphabetical_codes(train, test)
    y = train["Robbery"].to_numpy()
    rows = []
    for mtry in candidates or [2, 4, 6, 9, 13, 17]:
        rf = RandomForestClassifier(
            n_estimators=ntree, max_features=mtry, oob_score=True, n_jobs=-1, random_state=seed
        ).fit(xtr.to_numpy(), y)
        rows.append({"mtry": mtry, "oob_accuracy": float(rf.oob_score_)})
    table = pd.DataFrame(rows)
    return table, int(table.loc[table["oob_accuracy"].idxmax(), "mtry"])


def tune_gbm(
    train: pd.DataFrame, test: pd.DataFrame, folds: int = 5, seed: int = SEED
) -> tuple[pd.DataFrame, dict]:
    xtr, _ = j.response_rate_codes(train, test)
    x, y = xtr.to_numpy(), train["Robbery"].astype(int).to_numpy()
    rows = []
    for n_trees, depth in product([50, 100, 150], [1, 2, 3]):
        accs = []
        for tr, te in StratifiedKFold(folds, shuffle=True, random_state=seed).split(x, y):
            m = GradientBoostingClassifier(
                n_estimators=n_trees,
                max_depth=depth,
                learning_rate=0.1,
                subsample=0.5,
                min_samples_leaf=10,
                random_state=seed,
            ).fit(x[tr], y[tr])
            accs.append(float((m.predict(x[te]) == y[te]).mean()))
        rows.append({"n_trees": n_trees, "depth": depth, "accuracy": float(np.mean(accs))})
    table = (
        pd.DataFrame(rows)
        .sort_values("accuracy", ascending=False, kind="stable")
        .reset_index(drop=True)
    )
    return table, {"n_trees": int(table.loc[0, "n_trees"]), "depth": int(table.loc[0, "depth"])}


def tuned_rows(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    """Fit each model at its CV-chosen hyperparameters and score it on the test frame."""
    out: dict = {}
    yte = test["Robbery"].to_numpy()
    table, best = tune_xgb(train, test)
    xtr, xte = j.caret_dummies(train, test)
    model = _xgb(best, SEED, n_jobs=4).fit(xtr.to_numpy(), train["Robbery"].astype(int).to_numpy())
    cm = j.confusion(yte, model.predict_proba(xte.to_numpy())[:, 1] > 0.5)
    out["xgb"] = {
        "best": {k: float(v) for k, v in best.items()},
        "cv_accuracy": float(table.loc[0, "accuracy"]),
        "n_candidates": len(table),
        "test": cm,
        **j.scores(cm),
    }
    table, mtry = tune_forest_mtry(train, test)
    forest, _, xte = j.fit_forest(train, test, mtry=mtry)
    cm = j.confusion(yte, j.hard_vote(forest, xte))
    out["rf"] = {
        "best": {"mtry": mtry},
        "oob_table": table.to_dict("records"),
        "test": cm,
        **j.scores(cm),
    }
    table, best = tune_gbm(train, test)
    xtr, xte = j.response_rate_codes(train, test)
    gbm = GradientBoostingClassifier(
        n_estimators=best["n_trees"],
        max_depth=best["depth"],
        learning_rate=0.1,
        subsample=0.5,
        min_samples_leaf=10,
        random_state=SEED,
    )
    gbm.fit(xtr.to_numpy(), train["Robbery"].astype(int).to_numpy())
    cm = j.confusion(yte, gbm.predict_proba(xte.to_numpy())[:, 1] > 0.5)
    out["gbm"] = {
        "best": best,
        "cv_accuracy": float(table.loc[0, "accuracy"]),
        "test": cm,
        **j.scores(cm),
    }
    return out
