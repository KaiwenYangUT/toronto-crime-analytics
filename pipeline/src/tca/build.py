"""Table builders. Legacy builders reproduce each original, quirks included, behind named flags;
``unified`` is the clean shared table."""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from tca.definitions import (
    EXPLORE_SPEC,
    EXPLORE_START,
    LAT_RANGE,
    LEGACY_ORDER,
    LON_RANGE,
    RAW_FILES,
)
from tca.features import (
    calendar_date,
    darkness_fixed,
    month_from_abbrev,
    month_from_name,
    season,
)
from tca.io import RAW_DIR, as_char, as_num, read_text_csv

EXPLORE_COLUMNS = [
    "event_id",
    "date",
    "hour",
    "weekday",
    "category",
    "longitude",
    "latitude",
    "status",
    "location_type",
    "premises_type",
]


def explore_legacy(raw_dir: Path = RAW_DIR) -> tuple[pd.DataFrame, dict]:
    """Port of the Explorer's ``scripts/build_data.R``. Returns the event table and the
    per-file manifest (source rows, invalid rows, duplicates removed, ...)."""
    manifest: dict[str, dict] = {}
    tables = []
    start = pd.Timestamp(EXPLORE_START)
    for key, label in EXPLORE_SPEC.items():
        filename = RAW_FILES[key]
        raw = read_text_csv(raw_dir / filename)
        month = month_from_abbrev(as_char(raw["OCC_MONTH"]))
        dates = calendar_date(as_num(raw["OCC_YEAR"]), month, as_num(raw["OCC_DAY"]))
        event_id = as_char(raw["EVENT_UNIQUE_ID"])
        hour = as_num(raw["OCC_HOUR"])
        lon = as_num(raw["LONG_WGS84"])
        lat = as_num(raw["LAT_WGS84"])
        valid = (
            dates.notna()
            & event_id.notna()
            & (event_id != "")
            & hour.isin(range(24))
            & np.isfinite(lon)
            & np.isfinite(lat)
            & (lon > LON_RANGE[0])
            & (lon < LON_RANGE[1])
            & (lat > LAT_RANGE[0])
            & (lat < LAT_RANGE[1])
        )
        x = pd.DataFrame(
            {
                "event_id": event_id,
                "date": dates,
                "hour": hour,
                "weekday": dates.dt.isocalendar().day.astype("float64"),
                "category": label,
                "longitude": lon,
                "latitude": lat,
                "status": as_char(raw["STATUS"]) if key == "bicycle" else "Not applicable",
                "location_type": as_char(raw["LOCATION_TYPE"]),
                "premises_type": as_char(raw["PREMISES_TYPE"]),
            }
        )
        x = x[valid & (dates >= start)].copy()
        for col in ("status", "location_type", "premises_type"):
            x[col] = x[col].fillna("Unknown")
        before = len(x)
        x = x.drop_duplicates()
        manifest[filename] = {
            "source_rows": len(raw),
            "invalid_rows": int((~valid).sum()),
            "valid_rows_before_2020": int((valid & (dates < start)).sum()),
            "exact_duplicate_rows_removed": before - len(x),
            "retained_rows": len(x),
            "first_date": x["date"].min().strftime("%Y-%m-%d"),
            "last_date": x["date"].max().strftime("%Y-%m-%d"),
        }
        tables.append(x)
    events = pd.concat(tables, ignore_index=True)
    # R order(date, category, event_id), ties stable; ASCII order agrees with R's collation
    # for these identifiers (checked against R's exported row order).
    events = events.sort_values(["date", "category", "event_id"], kind="stable", ignore_index=True)
    for col in ("hour", "weekday"):
        events[col] = events[col].astype("int64")
    return events[EXPLORE_COLUMNS], manifest


# Columns the STA303 and JSC370 originals take from the seven MCI-style files (R read.csv types).
_LEGACY_CHAR = ["MCI_CATEGORY", "OCC_MONTH", "NEIGHBOURHOOD_158", "LOCATION_TYPE", "PREMISES_TYPE"]
_LEGACY_NUM = ["OCC_YEAR", "OCC_DAY", "OCC_HOUR", "LONG_WGS84", "LAT_WGS84"]

STA303_COLUMNS = [
    "Crime_Category",
    "Robbery",
    "Occurrence_Time",
    "Year",
    "Month",
    "Day_Of_Week_Numeric",
    "Hour",
    "Neighbourhood",
    "Location_Type",
    "Premises_Type",
    "Longitude",
    "Latitude",
    "Season",
    "Presence_of_Sunset",
    "Covid_Outbreak",
]


def _legacy_stack(raw_dir: Path) -> pd.DataFrame:
    """dplyr ``bind_rows`` of the seven files: missing columns become NA, file order kept."""
    parts = []
    for key in LEGACY_ORDER:
        raw = read_text_csv(raw_dir / RAW_FILES[key])
        part = pd.DataFrame(index=raw.index)
        for col in _LEGACY_CHAR:
            part[col] = as_char(raw[col]) if col in raw else None
        for col in _LEGACY_NUM:
            part[col] = as_num(raw[col], col) if col in raw else np.nan
        parts.append(part)
    return pd.concat(parts, ignore_index=True)


def _occurrence_time(crime: pd.DataFrame, month: pd.Series, drop_dst_gap_rows: bool) -> pd.Series:
    """R ``as.POSIXct(paste(y, m, d, h, sep="-"), format="%Y-%m-%d-%H")`` in America/Toronto.
    The local clock reading is returned (naive). Non-existent local times (the spring-forward
    hour) are NA in R, which is what ``drop_dst_gap_rows`` reproduces."""
    parts = pd.DataFrame(
        {
            "year": crime["OCC_YEAR"],
            "month": month,
            "day": crime["OCC_DAY"],
            "hour": crime["OCC_HOUR"],
        }
    )
    naive = pd.to_datetime(parts, errors="coerce")
    if drop_dst_gap_rows:
        gap = naive.dt.tz_localize("America/Toronto", nonexistent="NaT", ambiguous=True).isna()
        naive = naive.mask(gap)
    return naive


def sta303_legacy(
    raw_dir: Path = RAW_DIR, drop_dst_gap_rows: bool = True, dow_sunday_first: bool = True
) -> pd.DataFrame:
    """The STA303 model frame (``crime`` after ``complete.cases``), row order as in R.

    Flags: ``dow_sunday_first`` numbers weekdays Sunday=1..Saturday=7 as the Rmd does
    (otherwise ISO Monday=1); ``drop_dst_gap_rows`` makes non-existent local times NA
    (and so drops them through ``complete.cases``)."""
    crime = _legacy_stack(raw_dir)
    month = month_from_name(crime["OCC_MONTH"])
    when = _occurrence_time(crime, month, drop_dst_gap_rows)
    iso = when.dt.isocalendar().day.astype("float64")
    dow = (iso % 7) + 1 if dow_sunday_first else iso
    year = crime["OCC_YEAR"]
    frame = pd.DataFrame(
        {
            "Crime_Category": crime["MCI_CATEGORY"],
            "Robbery": (crime["MCI_CATEGORY"] == "Robbery")
            .astype("float64")
            .where(crime["MCI_CATEGORY"].notna()),
            "Occurrence_Time": when,
            "Year": year,
            "Month": month,
            "Day_Of_Week_Numeric": dow.where(when.notna()),
            "Hour": crime["OCC_HOUR"],
            "Neighbourhood": crime["NEIGHBOURHOOD_158"],
            "Location_Type": crime["LOCATION_TYPE"],
            "Premises_Type": crime["PREMISES_TYPE"],
            "Longitude": crime["LONG_WGS84"],
            "Latitude": crime["LAT_WGS84"],
            "Season": season(month),
            "Presence_of_Sunset": darkness_fixed(crime["OCC_HOUR"]),
            # cut(Year, c(0, 2019, Inf), labels = c(0, 1)): (0, 2019] -> 0, (2019, Inf) -> 1
            "Covid_Outbreak": pd.cut(year, [0, 2019, np.inf], labels=["0", "1"]).astype(object),
        }
    )
    return frame.dropna().reset_index(drop=True)[STA303_COLUMNS]
