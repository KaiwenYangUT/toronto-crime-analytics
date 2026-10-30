"""Faithful port of the JSC370 classification models.

All six models train on R's exported ``train_data`` / ``test_data`` frames at the
hyperparameters R chose (``parity/r_outputs/jsc370``). Known implementation limits, recorded in
PARITY.md: rpart and gbm split a factor by level subsets, which scikit-learn cannot, so factors
are ordered by training response rate (exact for a single two-class split, an approximation
inside deeper nodes); randomForest saw character columns as integer codes and so does this port.
"""

from __future__ import annotations

import json
import lzma
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier

from tca.definitions import SEED
from tca.io import ROOT

R_DIR = ROOT / "parity" / "r_outputs" / "jsc370"
FACTORS = ["Premises_Type", "Season"]
NUMERIC = [
    "Month",
    "Day_Of_Week_Numeric",
    "Hour",
    "Longitude",
    "Latitude",
    "Darkness",
    "Individual_Median_Income",
    "Individual_Average_Income",
    "Population",
    "Average_Household_Size",
    "Number_of_Rental_Properties",
    "Permanent_Job_and_Labour_Force_Ratio",
    "Transportation_Service_Worker_and_Population_Ratio",
    "HealthCare_Service_Worker_and_Population_Ratio",
    "Difference_in_Individual_Median_Average_Income",
]
# The 17 predictors in the order of final_data (which is the order randomForest/rpart saw).
PREDICTORS = [
    "Month",
    "Day_Of_Week_Numeric",
    "Hour",
    "Premises_Type",
    "Longitude",
    "Latitude",
    "Season",
    "Darkness",
    "Individual_Median_Income",
    "Individual_Average_Income",
    "Population",
    "Average_Household_Size",
    "Number_of_Rental_Properties",
    "Permanent_Job_and_Labour_Force_Ratio",
    "Transportation_Service_Worker_and_Population_Ratio",
    "HealthCare_Service_Worker_and_Population_Ratio",
    "Difference_in_Individual_Median_Average_Income",
]


def load_r_frames(r_dir: Path = R_DIR) -> tuple[pd.DataFrame, pd.DataFrame]:
    out = []
    for name in ("train_data", "test_data"):
        with lzma.open(r_dir / f"{name}.csv.xz", "rt") as fh:
            df = pd.read_csv(fh, keep_default_na=False)
        df["Robbery"] = df["Robbery"].astype(str).str.upper() == "TRUE"
        if df["Robbery"].nunique() != 2:
            raise ValueError(f"{name}: expected both classes in Robbery")
        out.append(df)
    return out[0], out[1]


def r_json(name: str, r_dir: Path = R_DIR) -> dict:
    return json.loads((r_dir / name).read_text())


# --- encodings ---------------------------------------------------------------------------------


def alphabetical_codes(
    train: pd.DataFrame, test: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """randomForest on character columns: ``data.matrix`` turns them into 1-based codes of the
    alphabetical level order (``character_as_codes=True``)."""
    levels = {c: sorted(train[c].unique()) for c in FACTORS}

    def enc(df):
        x = df[PREDICTORS].copy()
        for c in FACTORS:
            x[c] = df[c].map({lvl: i + 1 for i, lvl in enumerate(levels[c])}).astype(float)
        return x.astype(float)

    return enc(train), enc(test)


def response_rate_codes(
    train: pd.DataFrame, test: pd.DataFrame
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Order each factor's levels by training robbery rate, so a threshold on the code is the
    best subset split for a two-class problem."""
    order = {}
    for c in FACTORS:
        rate = train.groupby(c)["Robbery"].mean().sort_values(kind="stable")
        order[c] = {lvl: i for i, lvl in enumerate(rate.index)}

    def enc(df):
        x = df[PREDICTORS].copy()
        for c in FACTORS:
            x[c] = df[c].map(order[c]).astype(float)
        return x.astype(float)

    return enc(train), enc(test)


def caret_dummies(train: pd.DataFrame, test: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """``model.matrix`` as caret's formula interface builds it: treatment contrasts, the first
    (alphabetical) level of each factor is the reference, no intercept column."""
    levels = {c: sorted(train[c].unique()) for c in FACTORS}

    def enc(df):
        cols = {}
        for c in PREDICTORS:
            if c in FACTORS:
                for lvl in levels[c][1:]:
                    cols[f"{c}{lvl}"] = (df[c] == lvl).astype(float)
            else:
                cols[c] = df[c].astype(float)
        return pd.DataFrame(cols)

    return enc(train), enc(test)


# --- GLM ---------------------------------------------------------------------------------------


def glm_design(df: pd.DataFrame, levels: dict[str, list[str]]) -> pd.DataFrame:
    cols = {"(Intercept)": np.ones(len(df))}
    for c in PREDICTORS:
        if c in FACTORS:
            for lvl in levels[c][1:]:
                cols[f"{c}{lvl}"] = (df[c] == lvl).astype(float).to_numpy()
        else:
            cols[c] = df[c].astype(float).to_numpy()
    return pd.DataFrame(cols, index=df.index)


def independent_columns(X: pd.DataFrame, tol: float = 1e-7) -> list[str]:
    """Columns R's pivoted QR (dqrdc2) keeps, scanning left to right: a column that is a linear
    combination of earlier ones (relative residual below ``tol``) gets an NA coefficient."""
    keep: list[str] = []
    basis = np.empty((len(X), 0))
    for c in X.columns:
        v = X[c].to_numpy(dtype=float)
        norm = np.linalg.norm(v)
        if basis.shape[1]:
            resid = v - basis @ (basis.T @ v)
        else:
            resid = v
        if np.linalg.norm(resid) > tol * max(norm, 1.0):
            keep.append(c)
            basis = np.column_stack([basis, resid / np.linalg.norm(resid)])
    return keep


def fit_glm(train: pd.DataFrame, levels: dict[str, list[str]]):
    """Binomial logit on all terms; aliased columns are dropped (R reports NA)."""
    from tca.explain.sta303_port import fit_glm as irls

    X = glm_design(train, levels)
    keep = independent_columns(X)
    fit = irls(X[keep], train["Robbery"].astype(float).to_numpy())
    return fit, [c for c in X.columns if c not in keep]


def glm_predict(fit, df: pd.DataFrame, levels: dict[str, list[str]]) -> np.ndarray:
    X = glm_design(df, levels)[list(fit.params.index)]
    return 1.0 / (1.0 + np.exp(-(X.to_numpy() @ fit.params.to_numpy())))


# --- tree-based models -------------------------------------------------------------------------


class PrunedTree:
    """``prune(tree, cp = cp)`` of rpart: collapse every branch whose cost-complexity, in
    misclassification risk scaled by the root risk, is below ``cp``. rpart grows with Gini but
    prunes with this scale, not with the Gini impurity that scikit-learn's ``ccp_alpha`` uses."""

    def __init__(self, tree: DecisionTreeClassifier, cp: float):
        t = tree.tree_
        self.tree = tree
        left, right = t.children_left, t.children_right
        self.counts = t.value[:, 0, :] * t.n_node_samples[:, None]
        risk = self.counts.sum(axis=1) - self.counts.max(axis=1)  # errors if the node were a leaf
        n = t.node_count
        collapsed = np.zeros(n, bool)
        order = np.arange(n - 1, -1, -1)  # children have larger ids than their parent
        if risk[0] <= 0:
            raise ValueError("the root node is pure; there is nothing to prune")
        while True:
            n_leaf = np.ones(n)
            sub = risk.copy()
            for i in order:
                if left[i] != -1 and not collapsed[i]:
                    n_leaf[i] = n_leaf[left[i]] + n_leaf[right[i]]
                    sub[i] = sub[left[i]] + sub[right[i]]
            active = np.array([left[i] != -1 and not collapsed[i] for i in range(n)])
            if not active.any():
                break
            # rpart scales complexity by the root node's risk
            g = np.where(active, (risk - sub) / np.maximum(n_leaf - 1, 1) / risk[0], np.inf)
            target = int(np.argmin(g))
            if g[target] >= cp:
                break
            collapsed[target] = True
        parent = np.full(n, -1)
        for i in range(n):
            if left[i] != -1:
                parent[left[i]] = parent[right[i]] = i
        self.final = np.arange(n)
        for i in range(1, n):
            if collapsed[self.final[parent[i]]]:
                self.final[i] = self.final[parent[i]]
        self.n_leaves = int(n_leaf[0])
        self.n_splits = self.n_leaves - 1

    def predict(self, x: pd.DataFrame) -> np.ndarray:
        node = self.final[self.tree.apply(x.to_numpy())]
        return self.counts[node].argmax(axis=1).astype(bool)


def fit_tree(train: pd.DataFrame, test: pd.DataFrame, cp: float):
    """rpart(method = "class", minsplit = 150, minbucket = 5, cp = 0) pruned at R's chosen cp."""
    xtr, xte = response_rate_codes(train, test)
    grown = DecisionTreeClassifier(
        criterion="gini", min_samples_split=150, min_samples_leaf=5, random_state=SEED
    ).fit(xtr.to_numpy(), train["Robbery"].to_numpy())
    return PrunedTree(grown, cp), xtr, xte


def hard_vote(forest: RandomForestClassifier, x: pd.DataFrame) -> np.ndarray:
    """randomForest predicts the class with the most tree votes (cutoff 1/k), not the mean
    probability."""
    votes = np.mean([t.predict(x.to_numpy()) for t in forest.estimators_], axis=0)
    return votes > 0.5


def fit_forest(
    train: pd.DataFrame,
    test: pd.DataFrame,
    mtry: int,
    ntree: int = 500,
    character_as_codes: bool = True,
):
    """randomForest(Robbery ~ ., ntree = 500). ``character_as_codes`` (default, as the plan and
    inventory specify) feeds Premises_Type and Season as alphabetical integer codes; False orders
    the levels by response rate instead, an approximation of randomForest's factor-subset splits
    (the formula interface turns character columns into factors, so R may have done the latter)."""
    xtr, xte = (alphabetical_codes if character_as_codes else response_rate_codes)(train, test)
    forest = RandomForestClassifier(
        n_estimators=ntree,
        max_features=mtry,
        bootstrap=True,
        min_samples_leaf=1,
        n_jobs=-1,
        random_state=SEED,
    )
    forest.fit(xtr.to_numpy(), train["Robbery"].to_numpy())
    return forest, xtr, xte


def fit_gbm(train: pd.DataFrame, test: pd.DataFrame):
    """gbm(distribution = "bernoulli", n.trees = 100, interaction.depth = 1, shrinkage = 0.1,
    bag.fraction = 0.5 (default), n.minobsinnode = 10 (default))."""
    xtr, xte = response_rate_codes(train, test)
    model = GradientBoostingClassifier(
        n_estimators=100,
        max_depth=1,
        learning_rate=0.1,
        subsample=0.5,
        min_samples_leaf=10,
        random_state=SEED,
    )
    model.fit(xtr.to_numpy(), train["Robbery"].astype(int).to_numpy())
    return model, xtr, xte


def make_xgb(params: dict, seed: int, n_jobs: int = 4) -> XGBClassifier:
    """xgboost at a caret-style tuning row (exact tree method, base_score 0.5). Keys not in the
    row take caret's fixed values (gamma 0, min_child_weight 1)."""
    return XGBClassifier(
        n_estimators=int(params["nrounds"]),
        max_depth=int(params["max_depth"]),
        learning_rate=float(params["eta"]),
        gamma=float(params.get("gamma", 0.0)),
        colsample_bytree=float(params["colsample_bytree"]),
        min_child_weight=float(params.get("min_child_weight", 1.0)),
        subsample=float(params["subsample"]),
        tree_method="exact",
        base_score=0.5,
        objective="binary:logistic",
        n_jobs=n_jobs,
        random_state=seed,
    )


def fit_xgb(train: pd.DataFrame, test: pd.DataFrame, best_tune: dict, seed: int = SEED):
    """xgboost at caret's bestTune on caret's dummy design."""
    xtr, xte = caret_dummies(train, test)
    model = make_xgb(best_tune, seed).fit(xtr.to_numpy(), train["Robbery"].astype(int).to_numpy())
    return model, xtr, xte


# --- metrics -----------------------------------------------------------------------------------


def confusion(actual: np.ndarray, predicted: np.ndarray) -> dict[str, int]:
    a, p = np.asarray(actual, bool), np.asarray(predicted, bool)
    return {
        "tn": int((~a & ~p).sum()),
        "fp": int((~a & p).sum()),
        "fn": int((a & ~p).sum()),
        "tp": int((a & p).sum()),
    }


def scores(cm: dict[str, int]) -> dict[str, float]:
    n = sum(cm.values())
    acc = (cm["tn"] + cm["tp"]) / n
    pred_pos = cm["tp"] + cm["fp"]
    precision = cm["tp"] / pred_pos if pred_pos else float("nan")  # undefined, not 0
    recall = cm["tp"] / (cm["tp"] + cm["fn"])
    f1 = (
        2 * precision * recall / (precision + recall)
        if pred_pos and (precision + recall)
        else float("nan")
    )
    return {"accuracy": acc, "precision": precision, "recall": recall, "f1": f1}


def auc(actual: np.ndarray, score: np.ndarray) -> float:
    ranks = stats.rankdata(score)
    n1 = float(np.sum(actual))
    n0 = len(actual) - n1
    return float((ranks[np.asarray(actual, bool)].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


def run_all() -> dict:
    """Fit the six models and return predictions, matrices and importances."""
    train, test = load_r_frames()
    ytr, yte = train["Robbery"].to_numpy(), test["Robbery"].to_numpy()
    levels = r_json("glm_fit.json")["xlevels"]
    out: dict = {"actual_test": yte, "actual_train": ytr}

    fit, aliased = fit_glm(train, levels)
    p_te, p_tr = glm_predict(fit, test, levels), glm_predict(fit, train, levels)
    out["glm"] = {
        "test_pred": p_te > 0.5,
        "train_pred": p_tr > 0.5,
        "test_prob": p_te,
        "fit": fit,
        "aliased": aliased,
    }

    tree_info = r_json("tree_summary.json")
    tree, xtr, xte = fit_tree(train, test, cp=float(tree_info["optimalcp"]))
    out["tree"] = {
        "test_pred": tree.predict(xte).astype(bool),
        "train_pred": tree.predict(xtr).astype(bool),
        "model": tree,
    }

    for name, mtry in (("bagging", len(PREDICTORS)), ("rf", 4)):
        forest, xtr, xte = fit_forest(train, test, mtry=mtry)
        imp = pd.Series(forest.feature_importances_, index=PREDICTORS).sort_values(ascending=False)
        out[name] = {
            "test_pred": hard_vote(forest, xte),
            "train_pred": hard_vote(forest, xtr),
            "importance": imp,
            "model": forest,
        }

    gbm, xtr, xte = fit_gbm(train, test)
    out["gbm"] = {
        "test_pred": gbm.predict_proba(xte.to_numpy())[:, 1] > 0.5,
        "train_pred": gbm.predict_proba(xtr.to_numpy())[:, 1] > 0.5,
        "model": gbm,
    }

    best = r_json("xgb_summary.json")["best_tune"]
    xgb, xtr, xte = fit_xgb(train, test, best)
    out["xgb"] = {
        "test_pred": xgb.predict_proba(xte)[:, 1] > 0.5,
        "train_pred": xgb.predict_proba(xtr)[:, 1] > 0.5,
        "model": xgb,
    }
    return out


def xgb_seed_spread(
    train: pd.DataFrame, test: pd.DataFrame, best_tune: dict, n_seeds: int = 10
) -> pd.DataFrame:
    """The XGBoost fit is random (colsample_bytree = 0.8) and R's seed cannot be replayed, so the
    port is judged on the seeds SEED + 0 .. SEED + 9, fixed in advance, not on one fit."""
    xtr, xte = caret_dummies(train, test)
    y = train["Robbery"].astype(int).to_numpy()
    rows = []
    for k in range(n_seeds):
        model = make_xgb(best_tune, SEED + k).fit(xtr.to_numpy(), y)
        cm = confusion(test["Robbery"].to_numpy(), model.predict_proba(xte.to_numpy())[:, 1] > 0.5)
        rows.append({"seed": SEED + k, **cm, **scores(cm)})
    return pd.DataFrame(rows)
