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
    LON_RANGE,
    RAW_FILES,
)
from tca.features import calendar_date, month_from_abbrev
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
