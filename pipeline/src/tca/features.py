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


# --- solar darkness -----------------------------------------------------------------------------

TORONTO = (43.6532, -79.3832)  # latitude, longitude (east positive) of the city centre
CIVIL_TWILIGHT_DEG = -6.0


def solar_elevation(utc: pd.Series, lat: float = TORONTO[0], lon: float = TORONTO[1]) -> pd.Series:
    """Geometric elevation of the sun in degrees (no refraction) from NOAA's solar equations.

    ``utc`` is a naive UTC timestamp series. Accuracy is well under 0.1 degree, which is far finer
    than the hour-wide bins the analysis uses."""
    import numpy as np

    t_days = (utc - pd.Timestamp("2000-01-01 12:00")).dt.total_seconds().to_numpy() / 86_400.0
    T = t_days / 36_525.0
    rad = np.radians
    L0 = (280.46646 + T * (36_000.76983 + T * 0.0003032)) % 360
    M = 357.52911 + T * (35_999.05029 - 0.0001537 * T)
    e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
    C = (
        np.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T))
        + np.sin(rad(2 * M)) * (0.019993 - 0.000101 * T)
        + np.sin(rad(3 * M)) * 0.000289
    )
    apparent = L0 + C - 0.00569 - 0.00478 * np.sin(rad(125.04 - 1934.136 * T))
    obliq = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60
    obliq += 0.00256 * np.cos(rad(125.04 - 1934.136 * T))
    decl = np.arcsin(np.sin(rad(obliq)) * np.sin(rad(apparent)))
    y = np.tan(rad(obliq) / 2) ** 2
    eot = 4 * np.degrees(
        y * np.sin(2 * rad(L0))
        - 2 * e * np.sin(rad(M))
        + 4 * e * y * np.sin(rad(M)) * np.cos(2 * rad(L0))
        - 0.5 * y**2 * np.sin(4 * rad(L0))
        - 1.25 * e**2 * np.sin(2 * rad(M))
    )  # minutes
    minutes = (utc.dt.hour * 60 + utc.dt.minute + utc.dt.second / 60).to_numpy()
    solar_time = (minutes + eot + 4 * lon) % 1440
    hour_angle = rad(solar_time / 4 - 180)
    sin_el = np.sin(rad(lat)) * np.sin(decl) + np.cos(rad(lat)) * np.cos(decl) * np.cos(hour_angle)
    return pd.Series(np.degrees(np.arcsin(sin_el)), index=utc.index)


def _local_midpoint(date: pd.Series, hour: pd.Series) -> pd.Series:
    return date + pd.to_timedelta(hour * 60 + 30, unit="m")


def dst_flags(date: pd.Series, hour: pd.Series) -> tuple[pd.Series, pd.Series]:
    """(spring-forward, fall-back) flags for the local hour: the hour that does not exist on the
    clock-change day in spring, and the hour that happens twice in autumn."""
    local = _local_midpoint(date, hour)
    gap = local.dt.tz_localize("America/Toronto", nonexistent="NaT", ambiguous=True).isna()
    repeated = local.dt.tz_localize(
        "America/Toronto", nonexistent="shift_forward", ambiguous="NaT"
    ).isna()
    return gap, repeated


def hour_midpoint_utc(date: pd.Series, hour: pd.Series) -> pd.Series:
    """UTC instant of the middle (HH:30) of the local hour in America/Toronto. The missing
    spring-forward hour is read on the standard-time clock (shifted to the first valid instant
    after the gap, the same moment); the repeated autumn hour is taken at its first occurrence."""
    local = _local_midpoint(date, hour)
    aware = local.dt.tz_localize("America/Toronto", nonexistent="shift_forward", ambiguous=True)
    return aware.dt.tz_convert("UTC").dt.tz_localize(None)


def solar_darkness(date: pd.Series, hour: pd.Series) -> tuple[pd.Series, dict[str, int]]:
    """1 if the sun is below civil twilight (-6 degrees) at the middle of the local hour, else 0,
    plus the number of rows that fall in the awkward clock-change hours."""
    keys = pd.DataFrame({"date": date, "hour": hour}).drop_duplicates().reset_index(drop=True)
    keys["dark"] = (
        solar_elevation(hour_midpoint_utc(keys["date"], keys["hour"])) < CIVIL_TWILIGHT_DEG
    ).astype("int8")
    dark = pd.DataFrame({"date": date, "hour": hour}).merge(keys, on=["date", "hour"], how="left")[
        "dark"
    ]
    gap, repeated = dst_flags(date, hour)
    counts = {
        "spring_forward_hour_rows": int(gap.sum()),
        "fall_back_hour_rows": int((repeated & ~gap).sum()),
        "distinct_date_hours": len(keys),
    }
    return pd.Series(dark.to_numpy(), index=date.index), counts
