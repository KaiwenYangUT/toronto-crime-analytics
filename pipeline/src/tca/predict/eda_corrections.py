"""Data-backed replacements for the original JSC370 chart captions that the data contradict.

Each check states the original claim, computes the evidence from the 2020 table (the same rows as
the original charts) and sets a verdict by comparison, so no number in a caption is typed by hand.
Figure 2 is recomputed at neighbourhood level: the original repeated each neighbourhood's robbery
total on every incident row, so a neighbourhood with many incidents counted many times.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from tca.build import jsc370_legacy
from tca.figures.aggregates import DAYS, MONTHS, SEASONS
from tca.results import write_result


def shares(df: pd.DataFrame, col: str, labels: list[str], label_fn) -> pd.DataFrame:
    g = (
        df.assign(bin=df[col].map(label_fn))
        .groupby("bin")
        .agg(total=("Robbery", "size"), robbery=("Robbery", "sum"))
    )
    g = g.reindex(labels)
    g["share"] = g["robbery"] / g["total"]
    return g


def figure2_neighbourhood_level(df: pd.DataFrame) -> dict:
    """Robbery counts per neighbourhood, by darkness and premises (one value per neighbourhood)."""
    g = (
        df.assign(dark=df["Darkness"].astype(bool))
        .groupby(["dark", "Premises_Type", "Neighbourhood"])["Robbery"]
        .sum()
    )
    out: dict = {}
    for (dark, premises), s in g.groupby(level=[0, 1]):
        v = s.to_numpy()
        out.setdefault("dark" if dark else "light", {})[premises] = {
            "neighbourhoods": len(v),
            "neighbourhoods_with_a_robbery": int((v > 0).sum()),
            "median": float(np.median(v)),
            "q1": float(np.percentile(v, 25)),
            "q3": float(np.percentile(v, 75)),
            "max": int(v.max()),
            "total": int(v.sum()),
        }
    return out


def claims(df: pd.DataFrame) -> dict:
    season = shares(df, "Season", SEASONS, lambda v: v)
    month = shares(df, "Month", MONTHS, lambda v: MONTHS[int(v) - 1])
    day = shares(df, "Day_Of_Week_Numeric", DAYS, lambda v: DAYS[int(v) - 1])
    hour = shares(df, "Hour", [str(h) for h in range(24)], lambda v: str(int(v)))
    dark = df.groupby(df["Darkness"].astype(bool))["Robbery"].agg(["sum", "size"])
    top_months = month["robbery"].sort_values(ascending=False).head(3)
    hour_steps = np.diff(hour["total"].to_numpy())
    return {
        "summer_rise": {
            "original": "Robberies rise in summer, tied to warmer weather and holidays",
            "summer_robberies": int(season.loc["Summer", "robbery"]),
            "winter_robberies": int(season.loc["Winter", "robbery"]),
            "spring_robberies": int(season.loc["Spring", "robbery"]),
            "fall_robberies": int(season.loc["Fall", "robbery"]),
            "winter_share": float(season.loc["Winter", "share"]),
            "summer_share": float(season.loc["Summer", "share"]),
            "top_three_months": [str(m) for m in top_months.index],
            "contradicted": bool(season.loc["Winter", "robbery"] > season.loc["Summer", "robbery"]),
        },
        "weekend_peak": {
            "original": "Robberies are higher at weekends and lower on weekdays; Saturday and Thursday have the most incidents",
            "robberies_by_day": {d: int(day.loc[d, "robbery"]) for d in DAYS},
            "incidents_by_day": {d: int(day.loc[d, "total"]) for d in DAYS},
            "robbery_share_by_day": {d: float(day.loc[d, "share"]) for d in DAYS},
            "saturday_has_most_incidents": bool(day["total"].idxmax() == "Sat"),
            "most_incidents_day": str(day["total"].idxmax()),
            "most_robberies_days": [
                str(d) for d in day.index[day["robbery"] == day["robbery"].max()]
            ],
            "fewest_robberies_day": str(day["robbery"].idxmin()),
            "highest_robbery_share_day": str(day["share"].idxmax()),
            "contradicted": bool(day["total"].idxmax() != "Sat"),
        },
        "darkness": {
            "original": "Robberies are more likely after dark",
            "dark_share": float(dark.loc[True, "sum"] / dark.loc[True, "size"]),
            "light_share": float(dark.loc[False, "sum"] / dark.loc[False, "size"]),
            "dark_incidents": int(dark.loc[True, "size"]),
            "light_incidents": int(dark.loc[False, "size"]),
            "note": "shares of reported incidents that are robberies; the 18:00-06:00 cutoff is a clock rule, not measured sunset",
            "contradicted": bool(
                dark.loc[True, "sum"] / dark.loc[True, "size"]
                < dark.loc[False, "sum"] / dark.loc[False, "size"]
            ),
        },
        "hourly_shape": {
            "original": "Counts follow a smooth shape: normal around midnight, declining 1AM-11AM and 1PM-11PM",
            "incidents_by_hour": {
                int(h): int(v) for h, v in zip(range(24), hour["total"], strict=True)
            },
            "robbery_share_by_hour": {
                int(h): float(v) for h, v in zip(range(24), hour["share"], strict=True)
            },
            "rises_between_1am_and_11am": int((hour_steps[1:11] > 0).sum()),
            "rises_between_1pm_and_11pm": int((hour_steps[13:23] > 0).sum()),
            "contradicted": bool((hour_steps[1:11] > 0).any() and (hour_steps[13:23] > 0).any()),
        },
    }


def run(write: bool = True) -> dict:
    # the original charts use the widget builder's rows (2020, NSA dropped, census-joined)
    df = jsc370_legacy(keep_neighbourhood=True, na_omit_before_merge=False)
    values = {
        "rows": len(df),
        "robberies": int(df["Robbery"].sum()),
        "year": 2020,
        "claims": claims(df),
        "figure2_neighbourhood_level": figure2_neighbourhood_level(df),
        "figure2_note": "one value per neighbourhood; the original repeated each total on every incident row",
    }
    if write:
        write_result(
            "predict.eda_corrections",
            "predict",
            values,
            producer="tca.predict.eda_corrections",
            description="Evidence behind corrected JSC370 chart captions (summer, weekend, darkness, hourly) and "
            "neighbourhood-level Figure 2 statistics",
            formats={
                "claims.summer_rise.winter_share": {"percent": True, "decimals": 1},
                "claims.darkness.dark_share": {"percent": True, "decimals": 1},
            },
            inputs=[
                "Auto_Theft_Open_Data.csv",
                "Bicycle_Thefts_Open_Data.csv",
                "Break_and_Enter_Open_Data.csv",
                "Homicides_Open_Data_(ASR-RC-TBL-002).csv",
                "Robbery_Open_Data.csv",
                "Shooting_and_Firearm_Discharges_Open_Data.csv",
                "Theft_Over_Open_Data.csv",
                "Income_Dataset.xlsx",
            ],
        )
    return values


if __name__ == "__main__":
    v = run()
    for k, c in v["claims"].items():
        print(k, "contradicted" if c["contradicted"] else "supported")
