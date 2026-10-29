"""Compare the Python STA303 model outputs (tca.explain.sta303_port) with the R re-run exports.
Run: .venv/bin/python parity/compare/compare_sta303_model.py"""

import gzip
import json
import lzma
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import sta303_legacy
from tca.explain import lasso
from tca.explain import sta303_port as port

R = ROOT / "parity/r_outputs/sta303"


def read_f32(name: str, cols: int) -> np.ndarray:
    path = R / f"{name}.f32.xz"
    with lzma.open(path) as fh:
        raw = fh.read()
    return np.frombuffer(raw, dtype="<f4").reshape(-1, cols).astype("float64")


def rtol(a, b, floor=0.0):
    a, b = np.asarray(a, float), np.asarray(b, float)
    return float(np.max(np.abs(a - b) / np.maximum(np.abs(b), floor)))


def compare_glm(frame: pd.DataFrame) -> dict:
    y = frame["Robbery"].to_numpy()
    out = {}
    r_coef = pd.read_csv(R / "glm_full_coef.csv").set_index("term")
    fit = port.fit_glm(port.design(frame), y)
    table = port.summary_table(fit)
    out["full_coef_rtol"] = rtol(table["Estimate"], r_coef["Estimate"])
    out["full_se_rtol"] = rtol(table["Std. Error"], r_coef["Std. Error"])
    out["full_z_rtol"] = rtol(table["z value"], r_coef["z value"])
    out["full_p_rtol"] = rtol(table["Pr(>|z|)"], r_coef["Pr(>|z|)"], floor=1e-300)
    rf = json.loads((R / "glm_full_fit.json").read_text())
    out["deviance_rtol"] = rtol(fit.deviance, rf["deviance"])
    out["aic_rtol"] = rtol(fit.aic, rf["aic"])
    out["bic_rtol"] = rtol(fit.bic(), rf["bic"])
    out["loglik_rtol"] = rtol(fit.loglik, rf["loglik"])
    # displayed values: coefficients to 4 dp
    out["coef_4dp_identical"] = bool(
        (table["Estimate"].round(4).to_numpy() == r_coef["Estimate"].round(4).to_numpy()).all()
    )
    vif = port.gvif(fit, port.TERMS)
    r_vif = pd.read_csv(R / "vif.csv").set_index("term")
    out["gvif_rtol"] = rtol(vif.set_index("term")["GVIF"], r_vif["GVIF"])
    out["gvif_root_rtol"] = rtol(vif.set_index("term")["GVIF^(1/(2*Df))"], r_vif["GVIF^(1/(2*Df))"])
    return out


def compare_selection(frame: pd.DataFrame) -> dict:
    y = frame["Robbery"].to_numpy()
    r_sel = json.loads((R / "stepwise_selected.json").read_text())
    aic_terms, _ = port.stepwise(frame, y, k=2.0)
    bic_terms, _ = port.stepwise(frame, y, k=float(np.log(len(frame))))
    out = {
        "aic_terms_equal": aic_terms == r_sel["aic_terms"],
        "bic_terms_equal": bic_terms == r_sel["bic_terms"],
    }
    big = port.fit_glm(port.design(frame, port.TERMS), y)
    small = port.fit_glm(port.design(frame, r_sel["bic_terms"]), y)
    lr = port.lr_test(small, big)
    r_lrt = pd.read_csv(R / "lrt.csv")
    out["lrt_chisq_rtol"] = rtol(lr["chisq"], r_lrt["Chisq"].iloc[1])
    out["lrt_p_rtol"] = rtol(lr["p"], r_lrt["Pr..Chisq."].iloc[1])
    out["lrt_df_equal"] = lr["df"] == int(r_lrt["Df"].iloc[1])
    return out


def compare_influence(frame: pd.DataFrame) -> dict:
    y = frame["Robbery"].to_numpy()
    fit = port.fit_glm(port.design(frame), y)
    inf = port.influence(fit)
    out = {}
    r_dfb = read_f32("dfbetas", 9)
    out["dfbetas_max_abs_diff"] = float(np.max(np.abs(inf["dfbetas"] - r_dfb)))
    out["dffits_rtol"] = rtol(inf["dffits"], read_f32("dffits", 1)[:, 0], floor=1e-3)
    out["cooks_rtol"] = rtol(inf["cooks"], read_f32("cooks", 1)[:, 0], floor=1e-12)
    out["working_resid_rtol"] = rtol(
        inf["working_resid"], read_f32("working_resid", 1)[:, 0], floor=1e-3
    )

    def top20(v):
        return list(np.argsort(-np.abs(np.round(v, 12)), kind="stable")[:20] + 1)

    r_top = lambda name: list(pd.read_csv(R / name)["index"])
    out["top20_cooks_equal"] = top20(inf["cooks"]) == r_top("top20_cooks.csv")
    out["top20_dffits_equal"] = top20(inf["dffits"]) == r_top("top20_dffits.csv")
    out["top20_dfbetas_equal"] = [
        top20(inf["dfbetas"][:, j]) == r_top(f"top20_dfbetas_{j + 1}.csv") for j in range(9)
    ]
    return out


def compare_roc_lrm(frame: pd.DataFrame) -> dict:
    y = frame["Robbery"].to_numpy()
    fit = port.fit_glm(port.design(frame), y)
    out = {}
    roc = port.roc_curve(y, fit.mu)
    with lzma.open(R / "roc_curve.csv.xz", "rt") as fh:
        r_roc = pd.read_csv(fh)
    out["roc_rows_equal"] = len(roc) == len(r_roc)
    finite = np.isfinite(r_roc["threshold"].to_numpy())
    out["roc_threshold_max_abs_diff"] = float(
        np.max(np.abs(roc["threshold"].to_numpy()[finite] - r_roc["threshold"].to_numpy()[finite]))
    )
    out["roc_sens_max_abs_diff"] = float(np.max(np.abs(roc["sensitivity"] - r_roc["sensitivity"])))
    out["roc_spec_max_abs_diff"] = float(np.max(np.abs(roc["specificity"] - r_roc["specificity"])))
    r_auc = json.loads((R / "roc_summary.json").read_text())["auc"]
    out["auc_rtol"] = rtol(port.auc(y, fit.mu), r_auc)
    out["auc_label_text_equal"] = f"{port.auc(y, fit.mu):.2f}" == f"{r_auc:.2f}"
    stats_py = port.lrm_stats(fit)
    r_stats = pd.read_csv(R / "lrm_stats.csv").set_index("stat")["value"]
    out["lrm_stats_rtol"] = {k: rtol(v, r_stats[k]) for k, v in stats_py.items()}
    g = port.fit_glm(port.design(frame), y, family="gaussian")
    t = port.summary_table(g)
    r_g = pd.read_csv(R / "glm_gaussian_coef.csv").set_index("term")
    out["gaussian_coef_rtol"] = rtol(t["Estimate"], r_g["Estimate"])
    out["gaussian_se_rtol"] = rtol(t["Std. Error"], r_g["Std. Error"])
    out["gaussian_t_rtol"] = rtol(t["t value"], r_g["t value"])
    out["gaussian_p_rtol"] = rtol(t["Pr(>|t|)"], r_g["Pr(>|t|)"], floor=1e-300)
    gj = json.loads((R / "glm_gaussian_fit.json").read_text())
    out["gaussian_aic_rtol"] = rtol(g.aic, gj["aic"])
    out["gaussian_bic_rtol"] = rtol(g.bic(), gj["bic"])
    out["gaussian_deviance_rtol"] = rtol(g.deviance, gj["deviance"])
    return out


def compare_calibration(frame: pd.DataFrame) -> dict:
    y = frame["Robbery"].to_numpy()
    fit = port.fit_glm(port.design(frame), y)
    cal = port.calibration(frame, y, port.TERMS, seed=123)
    r_cal = pd.read_csv(R / "calibration_matrix.csv")
    out = {
        "grid_max_abs_diff": float(np.max(np.abs(cal["predy"] - r_cal["predy"]))),
        "apparent_max_abs_diff": float(
            np.nanmax(np.abs(cal["calibrated.orig"] - r_cal["calibrated.orig"]))
        ),
        "corrected_max_abs_diff": float(
            np.nanmax(np.abs(cal["calibrated.corrected"] - r_cal["calibrated.corrected"]))
        ),
    }
    py = port.calibration_errors(fit, cal)
    r_err = json.loads((R / "calibration_errors.json").read_text())
    out["printed_stats_py"] = py
    out["printed_stats_r"] = r_err
    out["printed_stats_max_abs_diff"] = max(
        abs(py[k] - r_err[k]) for k in ("mean_abs_error", "mean_squared_error", "q90_abs_error")
    )
    out["printed_n_equal"] = py["n"] == r_err["n"]
    return out


def compare_lasso(frame: pd.DataFrame) -> dict:
    x, names = port.lasso_matrix(frame)
    y = frame["Robbery"].to_numpy()
    with gzip.open(R / "foldid.csv.gz", "rt") as fh:
        foldid = np.array([int(v) for v in fh.read().split()])
    cv = lasso.cv_glmnet(x, y, foldid)
    r_cv = pd.read_csv(R / "lasso_cv.csv")
    r_sum = json.loads((R / "lasso_summary.json").read_text())
    out = {"n_lambda_equal": len(cv["lambda"]) == len(r_cv)}
    if not out["n_lambda_equal"]:
        out["n_lambda"] = [len(cv["lambda"]), len(r_cv)]
        return out
    out["lambda_rtol"] = rtol(cv["lambda"], r_cv["lambda"])
    out["cvm_max_abs_diff"] = float(np.max(np.abs(cv["cvm"] - r_cv["cvm"])))
    out["cvm_rtol"] = rtol(cv["cvm"], r_cv["cvm"])
    out["cvsd_rtol"] = rtol(cv["cvsd"], r_cv["cvsd"])
    # glmnet counts the collinear Covid_Outbreak1 dummy as non-zero once it holds ~1e-15 noise
    gap = r_cv["nzero"].to_numpy() - cv["nzero"]
    out["nzero_gap_at_most_the_collinear_dummy"] = bool(((gap == 0) | (gap == 1)).all())
    out["lambda_min_equal"] = cv["lambda_min"] == r_sum["lambda_min"] or bool(
        np.isclose(cv["lambda_min"], r_sum["lambda_min"], rtol=1e-9)
    )
    # final fit at lambda.min, cold start, as glmnet(x, y, lambda = best_lambda)
    final = lasso.glmnet_path(x, y, lambdas=np.array([r_sum["lambda_min"]]))
    b0, b = final.coef_original()
    r_coef = pd.read_csv(R / "lasso_coef.csv").set_index("term")["coef"]
    py = pd.Series(np.concatenate([b0, b[0]]), index=["(Intercept)", *names])
    out["coef_max_abs_diff"] = float(np.max(np.abs(py - r_coef.reindex(py.index))))
    out["contrast_covid1_minus_covid0_py"] = float(py["Covid_Outbreak1"] - py["Covid_Outbreak0"])
    out["contrast_covid1_minus_covid0_r"] = float(
        r_coef["Covid_Outbreak1"] - r_coef["Covid_Outbreak0"]
    )
    eta_py = b0[0] + x @ b[0]
    eta_r = r_coef["(Intercept)"] + x @ r_coef.reindex(names).to_numpy()
    out["linear_predictor_max_abs_diff"] = float(np.max(np.abs(eta_py - eta_r)))
    out["zero_pattern_equal"] = bool(
        ((py.drop("(Intercept)").abs() < 1e-8) == (r_coef.reindex(names).abs() < 1e-8)).all()
    )
    return out


def compare() -> dict:
    frame = sta303_legacy()
    return {
        "lasso": compare_lasso(frame),
        "roc_lrm_gaussian": compare_roc_lrm(frame),
        "calibration": compare_calibration(frame),
        "glm": compare_glm(frame),
        "selection": compare_selection(frame),
        "influence": compare_influence(frame),
    }


if __name__ == "__main__":
    report = compare()
    path = ROOT / "parity/reports/sta303_port.json"
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(report, indent=1, default=str) + "\n")
    print(f"wrote {path.relative_to(ROOT)}")
