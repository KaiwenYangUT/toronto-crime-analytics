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


def _cv_accuracy(params: dict, x: np.ndarray, y: np.ndarray, folds: int, seed: int) -> float:
    accs = []
    for tr, te in StratifiedKFold(folds, shuffle=True, random_state=seed).split(x, y):
        model = j.make_xgb(params, seed, n_jobs=1).fit(x[tr], y[tr])
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
    model = j.make_xgb(best, SEED).fit(xtr.to_numpy(), train["Robbery"].astype(int).to_numpy())
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


# The grid the original wrote down but never passed to train(): depth 1/3/5/7, 50-500 rounds in
# steps of 50, eta 0.5, gamma 0, subsample 1, min_child_weight 1, colsample 0.6 (40 combinations).
INTENDED_GRID = {
    "nrounds": list(range(50, 501, 50)),
    "max_depth": [1, 3, 5, 7],
    "eta": [0.5],
    "colsample_bytree": [0.6],
    "subsample": [1.0],
}


def seed_mean_metrics(
    params: dict, train: pd.DataFrame, test: pd.DataFrame, n_seeds: int = 10
) -> dict:
    """Test metrics of the XGBoost setting, averaged over the fixed seeds SEED..SEED+9."""
    spread = j.xgb_seed_spread(train, test, params, n_seeds)
    return {
        "tp_mean": float(spread["tp"].mean()),
        "fp_mean": float(spread["fp"].mean()),
        "f1_mean": float(spread["f1"].mean()),
        "accuracy_mean": float(spread["accuracy"].mean()),
        "f1_min": float(spread["f1"].min()),
        "f1_max": float(spread["f1"].max()),
    }


def grid_fix(train: pd.DataFrame, test: pd.DataFrame) -> dict:
    """The original ran caret's default grid ("as-run"); its own tune_grid ("as-intended") was
    never used. Both are tuned by 10-fold CV accuracy on the training frame and then scored on the
    same test frame at the decision threshold of 0.5 the original used."""
    as_run = j.r_json("xgb_summary.json")["best_tune"]
    table, intended = tune_xgb(train, test, grid=INTENDED_GRID)
    return {
        "as_run_caret_default": {
            "best": as_run,
            "grid_size": 108,
            "test": seed_mean_metrics(as_run, train, test),
        },
        "as_intended": {
            "best": {k: float(v) for k, v in intended.items()},
            "grid_size": len(table),
            "cv_accuracy": float(table.loc[0, "accuracy"]),
            "cv_table": table.round(6).to_dict("records"),
            "test": seed_mean_metrics(intended, train, test),
        },
        "threshold": 0.5,
        "seeds": "SEED..SEED+9",
    }
