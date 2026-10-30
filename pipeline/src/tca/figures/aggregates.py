"""The data behind each original JSC370 chart, computed from the Python tables.

Each function mirrors one chart of the refreshed branch (scripts/build_visual_widgets.R and
variable.Rmd) and returns the arrays the chart plots, in the order R produced them. Formatting
helpers reproduce R's ``paste``/``format`` output where a chart carries text.
"""

from __future__ import annotations

import hashlib
from collections import Counter

import numpy as np
import pandas as pd

SEASONS = ["Spring", "Summer", "Fall", "Winter"]
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
SUMMARY_COLUMNS = [
    "Longitude",
    "Latitude",
    "Population",
    "Average_Household_Size",
    "Number_of_Rental_Properties",
    "Permanent_Job_and_Labour_Force_Ratio",
    "Transportation_Service_Worker_and_Population_Ratio",
    "HealthCare_Service_Worker_and_Population_Ratio",
    "Difference_in_Individual_Median_Average_Income",
]


def r_num(v: float, digits: int | None = None) -> str:
    """R ``as.character`` of a number (15 significant digits, no trailing zeros)."""
    return f"{round(v, digits) if digits is not None else v:.15g}"


def digest(values: list[str]) -> dict:
    return {"n": len(values), "sha256": hashlib.sha256("\n".join(values).encode()).hexdigest()}


def figure1(df: pd.DataFrame) -> dict:
    """3D scatter: one point per neighbourhood (C-locale order, as dplyr sorts groups)."""
    g = df.groupby("Neighbourhood", sort=True).agg(
        x=("Permanent_Job_and_Labour_Force_Ratio", "first"),
        y=("Individual_Median_Income", "first"),
        z=("Robbery", "sum"),
    )
    text = [
        f"Neighbourhood: {n} <br>#P.J. / #L.F.: {r_num(r.x, 3)} <br>Median Income: {r_num(r.y)} "
        f"<br>Robbery Count: {int(r.z)}"
        for n, r in g.iterrows()
    ]
    return {"x": g["x"].tolist(), "y": g["y"].tolist(), "z": [int(v) for v in g["z"]], "text": text}


def figure2(df: pd.DataFrame) -> dict[str, dict[str, int]]:
    """Boxplots: per premises, the neighbourhood robbery total of the incident's darkness group,
    repeated on every incident row (so each box is weighted by incidents). Returned as counts of
    (darkness, value) pairs, because the row order after merge() is not part of the chart."""
    work = df.assign(dark=df["Darkness"].astype(bool))
    totals = work.groupby(["dark", "Neighbourhood"])["Robbery"].transform("sum")
    work = work.assign(count=totals.astype(int))
    out: dict[str, dict[str, int]] = {}
    for premises, sub in work.groupby("Premises_Type", sort=True):
        out[premises] = dict(
            Counter(f"{bool(d)}|{c}" for d, c in zip(sub["dark"], sub["count"], strict=True))
        )
    return out


_KEYS = {
    "season": ("Season", SEASONS, lambda v: v),
    "month": ("Month", MONTHS, lambda v: MONTHS[int(v) - 1]),
    "day": ("Day_Of_Week_Numeric", DAYS, lambda v: DAYS[int(v) - 1]),
    "hour": ("Hour", [str(h) for h in range(24)], lambda v: str(int(v))),
}


def figure3(df: pd.DataFrame, key: str) -> dict[str, dict]:
    """Robbery count by premises and a time bin: one line per premises, absent groups not zero-filled."""
    col, order, label = _KEYS[key]
    g = (
        df.assign(bin=df[col].map(label))
        .groupby(["Premises_Type", "bin"])["Robbery"]
        .sum()
        .reset_index()
    )
    out = {}
    for premises, sub in g.groupby("Premises_Type", sort=True):
        sub = sub.assign(rank=sub["bin"].map({b: i for i, b in enumerate(order)})).sort_values(
            "rank"
        )
        out[premises] = {"x": sub["bin"].tolist(), "y": [int(v) for v in sub["Robbery"]]}
    return out


def figure4(df: pd.DataFrame, key: str) -> dict:
    """Total incidents and robbery counts by bin, with R's rounded percentage labels."""
    col, order, label = _KEYS[key]
    g = (
        df.assign(bin=df[col].map(label))
        .groupby("bin")
        .agg(total=("Robbery", "size"), robbery=("Robbery", "sum"))
    )
    g = g.reindex(order).dropna()
    return {
        "x": list(g.index),
        "total": [int(v) for v in g["total"]],
        "robbery": [int(v) for v in g["robbery"]],
        "text": [
            r_num(100 * r / t, 2) + "%" for r, t in zip(g["robbery"], g["total"], strict=True)
        ],
    }


def figure5(df: pd.DataFrame) -> dict:
    """Map: one circle per robbery incident, in table order, with the popup text."""
    r = df[df["Robbery"]]
    popups = [
        f"Neighbourhood:  {n} <br> Premises Type:  {p} <br> Population:  {r_num(pop)}"
        for n, p, pop in zip(r["Neighbourhood"], r["Premises_Type"], r["Population"], strict=True)
    ]
    return {
        "lat": r["Latitude"].tolist(),
        "lng": r["Longitude"].tolist(),
        "popup": digest(popups),
        "popup_sorted": digest(sorted(popups)),
    }


def variable_page(df: pd.DataFrame) -> dict:
    """The key-variable table (strings as DT shows them) and the four count series."""
    cols = {}
    for stat, fn in (
        ("Min", np.min),
        ("Q1", lambda v: np.percentile(v, 25)),
        ("Median", np.median),
        ("Mean", np.mean),
        ("Q3", lambda v: np.percentile(v, 75)),
        ("Max", np.max),
    ):
        values = [float(fn(df[c].to_numpy())) for c in SUMMARY_COLUMNS]
        rounded = [
            f"{round(v):,}" for v in values
        ]  # format(round(., 0), big.mark = ",") on the whole column
        width = max(map(len, rounded))
        cols[stat] = [
            rounded[i].rjust(width) if abs(v) >= 1000 else f"{v:.3f}" for i, v in enumerate(values)
        ]
    season = df.groupby("Season").size()
    month = df.groupby("Month").size()
    day = df.groupby("Day_Of_Week_Numeric").size()
    hour = df.groupby("Hour").size()
    return {
        "table": cols,
        "season": {"x": list(season.index), "y": [int(v) for v in season]},
        "month": {"x": [MONTHS[int(m) - 1] for m in month.index], "y": [int(v) for v in month]},
        "day": {"x": [DAYS[int(d) - 1] for d in day.index], "y": [int(v) for v in day]},
        "hour": {"x": [f"{int(h):02d}:00" for h in hour.index], "y": [int(v) for v in hour]},
    }
