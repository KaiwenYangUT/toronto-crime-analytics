"""Neighbourhood census scatter (JSC370 Figure 1) as a results file, for the Explain page.

The points are exactly the arrays of the original 3D scatter (``figures.aggregates.figure1``, the
refreshed branch's widget-builder rows: 2020 incidents, one point per neighbourhood, C-locale order).
The summary adds the statistics behind the corrected caption: rank correlations of the robbery count
with median income and with the permanent-job ratio, and a split of neighbourhoods at the top decile
of the robbery count. Counts are reported incidents, not risk.

Top decile (explicit rule): the neighbourhoods whose 2020 robbery count is at least the 90th
percentile of the 158 counts, taken as the smallest observed count at or above the 0.9 quantile
(``numpy`` method ``"higher"``). Ties at the threshold stay in the group, so ``n`` can exceed 16.
``rest`` is every other neighbourhood. Medians are plain medians over neighbourhoods.

Bands (explicit rule): ``income_bands`` and ``ratio_bands`` split the 158 neighbourhoods into five groups
by quintile of median income and of the permanent-job ratio. The edges are the 0.2, 0.4, 0.6 and 0.8
quantiles (linear interpolation); a band is closed on the right, so a value equal to an edge goes to the
lower band and neighbourhoods with the same value always share a band. Band sizes are therefore close to,
not exactly, 158 / 5. Bands run from the lowest to the highest value; ``low`` and ``high`` are the smallest
and largest observed value in the band. Each band reports its neighbourhood count ``n`` and the median,
mean and largest robbery count; the statistics do not depend on row order.
"""

from __future__ import annotations

import numpy as np
from scipy import stats

from tca.build import jsc370_legacy
from tca.figures.aggregates import figure1
from tca.results import write_result

INPUTS = [
    "Auto_Theft_Open_Data.csv",
    "Bicycle_Thefts_Open_Data.csv",
    "Break_and_Enter_Open_Data.csv",
    "Homicides_Open_Data_(ASR-RC-TBL-002).csv",
    "Robbery_Open_Data.csv",
    "Shooting_and_Firearm_Discharges_Open_Data.csv",
    "Theft_Over_Open_Data.csv",
    "Income_Dataset.xlsx",
]
INT = {"decimals": 0}
ONE = {"decimals": 1}
BAND_EDGES = (0.2, 0.4, 0.6, 0.8)
RATIO = {"decimals": 3}
INCOME = {"decimals": 0}
RHO = {"decimals": 2}
P = {"p": True}


def names_in_figure1_order(df) -> list[str]:
    """Neighbourhood names in the order figure1 groups them (plain code-point sort, no locale)."""
    return sorted(df["Neighbourhood"].unique())


def spearman(a: np.ndarray, b: np.ndarray) -> dict:
    res = stats.spearmanr(a, b)
    return {"rho": float(res.statistic), "p": float(res.pvalue)}


def bands(x: np.ndarray, count: np.ndarray) -> list[dict]:
    """Five quantile bands of ``x`` (lowest first) with the robbery count statistics of each."""
    edges = np.quantile(x, BAND_EDGES)
    which = np.searchsorted(edges, x, side="left")  # value <= edge goes to the lower band
    out = []
    for b in range(len(BAND_EDGES) + 1):
        m = which == b
        out.append(
            {
                "band": b + 1,
                "n": int(m.sum()),
                "low": float(x[m].min()),
                "high": float(x[m].max()),
                "median_robberies": float(np.median(count[m])),
                "mean_robberies": float(count[m].mean()),
                "max_robberies": int(count[m].max()),
            }
        )
    return out


def build_values(df) -> dict:
    fig = figure1(df)
    names = names_in_figure1_order(df)
    ratio = np.array(fig["x"], dtype=float)
    income = np.array(fig["y"], dtype=float)
    count = np.array(fig["z"], dtype=int)
    if not (len(names) == len(ratio) == len(income) == len(count)):
        raise ValueError("figure1 arrays and neighbourhood names differ in length")
    if np.isnan(ratio).any() or np.isnan(income).any():
        raise ValueError("a neighbourhood has no census values")

    threshold = int(np.quantile(count, 0.9, method="higher"))
    top = count >= threshold
    rest = ~top
    imax = int(np.argmax(count))  # first maximum in code-point order if tied

    def group(mask: np.ndarray) -> dict:
        return {
            "n": int(mask.sum()),
            "median_income": float(np.median(income[mask])),
            "median_ratio": float(np.median(ratio[mask])),
        }

    return {
        "points": [
            {"name": n, "ratio": float(r), "income": float(i), "robberies": int(c)}
            for n, r, i, c in zip(names, ratio, income, count, strict=True)
        ],
        "summary": {
            "n": len(count),
            "total_robberies": int(count.sum()),
            "spearman_income": spearman(income, count),
            "spearman_ratio": spearman(ratio, count),
            "top_decile": {"threshold": threshold, **group(top)},
            "rest": group(rest),
            "max": {"name": names[imax], "robberies": int(count[imax])},
            "income_bands": bands(income, count),
            "ratio_bands": bands(ratio, count),
        },
        "axes": {
            "ratio_min": float(ratio.min()),
            "ratio_max": float(ratio.max()),
            "income_min": float(income.min()),
            "income_max": float(income.max()),
            "robberies_max": int(count.max()),
        },
    }


FORMATS = {
    "points.*.ratio": RATIO,
    "points.*.income": INCOME,
    "points.*.robberies": INT,
    "summary.n": INT,
    "summary.total_robberies": INT,
    "summary.spearman_income.rho": RHO,
    "summary.spearman_income.p": P,
    "summary.spearman_ratio.rho": RHO,
    "summary.spearman_ratio.p": P,
    "summary.top_decile.threshold": INT,
    "summary.top_decile.n": INT,
    "summary.top_decile.median_income": INCOME,
    "summary.top_decile.median_ratio": RATIO,
    "summary.rest.n": INT,
    "summary.rest.median_income": INCOME,
    "summary.rest.median_ratio": RATIO,
    "summary.max.robberies": INT,
    "summary.income_bands.*.band": INT,
    "summary.income_bands.*.n": INT,
    "summary.income_bands.*.low": INCOME,
    "summary.income_bands.*.high": INCOME,
    "summary.income_bands.*.median_robberies": ONE,
    "summary.income_bands.*.mean_robberies": ONE,
    "summary.income_bands.*.max_robberies": INT,
    "summary.ratio_bands.*.band": INT,
    "summary.ratio_bands.*.n": INT,
    "summary.ratio_bands.*.low": RATIO,
    "summary.ratio_bands.*.high": RATIO,
    "summary.ratio_bands.*.median_robberies": ONE,
    "summary.ratio_bands.*.mean_robberies": ONE,
    "summary.ratio_bands.*.max_robberies": INT,
    "axes.ratio_min": RATIO,
    "axes.ratio_max": RATIO,
    "axes.income_min": INCOME,
    "axes.income_max": INCOME,
    "axes.robberies_max": INT,
}


def run(write: bool = True) -> dict:
    df = jsc370_legacy(keep_neighbourhood=True, na_omit_before_merge=False)
    values = build_values(df)
    if write:
        write_result(
            "predict.census_scatter",
            "predict",
            values,
            producer="tca.explain.census_scatter",
            description="JSC370 Figure 1 data: one point per neighbourhood (job ratio, median income, 2020 "
            "robbery count) and the rank correlations and five-band summaries behind the corrected caption",
            formats=FORMATS,
            inputs=INPUTS,
        )
    return values


if __name__ == "__main__":
    s = run()["summary"]
    print({k: s[k] for k in ("n", "total_robberies", "spearman_income", "spearman_ratio")})
    print(s["top_decile"], s["rest"], s["max"])
