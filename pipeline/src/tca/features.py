"""Time and calendar features, each mirroring the rule the originals used."""

from __future__ import annotations

import calendar

import pandas as pd

MONTH_NAMES = list(calendar.month_name)[1:]  # R month.name
MONTH_ABB = list(calendar.month_abbr)[1:]  # R month.abb


def month_from_name(names: pd.Series) -> pd.Series:
    """R ``match(x, month.name)``: NaN where the name is not a full English month."""
    lookup = {m: i + 1 for i, m in enumerate(MONTH_NAMES)}
    return names.map(lookup).astype("float64")


def month_from_abbrev(names: pd.Series) -> pd.Series:
    """R ``match(substr(x, 1, 3), month.abb)``."""
    lookup = {m: i + 1 for i, m in enumerate(MONTH_ABB)}
    return names.str[:3].map(lookup).astype("float64")


def calendar_date(year: pd.Series, month: pd.Series, day: pd.Series) -> pd.Series:
    """Valid calendar date or NaT. Invalid combinations (31 Feb) are NaT, like the R round trip."""
    parts = pd.DataFrame({"year": year, "month": month, "day": day})
    return pd.to_datetime(parts, errors="coerce")


def season(month: pd.Series) -> pd.Series:
    """Spring Mar-May, Summer Jun-Aug, Fall Sep-Nov, otherwise Winter (also for missing month)."""
    out = pd.Series("Winter", index=month.index, dtype=object)
    out[month.isin([3, 4, 5])] = "Spring"
    out[month.isin([6, 7, 8])] = "Summer"
    out[month.isin([9, 10, 11])] = "Fall"
    return out


def darkness_fixed(hour: pd.Series, sunset: int = 18, sunrise: int = 6) -> pd.Series:
    """Fixed clock rule used by the originals: 1 if hour >= 18 or hour < 6. Not measured sunset."""
    return ((hour >= sunset) | (hour < sunrise)).astype("float64").where(hour.notna())
