"""Table builders. Legacy builders reproduce each original, quirks included, behind named flags;
``unified`` is the clean shared table."""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

from tca.definitions import (
    CLASSES,
    EXPLORE_SPEC,
    EXPLORE_START,
    JSC370_YEAR,
    LAT_RANGE,
    LEGACY_ORDER,
    LON_RANGE,
    NSA,
    POSITIVE,
    RAW_FILES,
    YEAR_MAX,
    YEAR_MIN,
)
from tca.features import (
    calendar_date,
    darkness_fixed,
    month_from_abbrev,
    month_from_name,
    season,
)
from tca.io import RAW_DIR, as_char, as_num, census_column, read_census, read_text_csv

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


def explore_legacy(
    raw_dir: Path = RAW_DIR, spec: dict[str, str] = EXPLORE_SPEC
) -> tuple[pd.DataFrame, dict]:
    """Port of the Explorer's ``scripts/build_data.R``. Returns the event table and the
    per-file manifest (source rows, invalid rows, duplicates removed, ...)."""
    manifest: dict[str, dict] = {}
    tables = []
    start = pd.Timestamp(EXPLORE_START)
    for key, label in spec.items():
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
            "first_date": x["date"].min().strftime("%Y-%m-%d") if len(x) else None,
            "last_date": x["date"].max().strftime("%Y-%m-%d") if len(x) else None,
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


# (header in the workbook, name used by the original) for the 19 selected census columns.
_CENSUS_SELECT = {
    "Neighbourhood Name": "Neighbourhood",
    "Median total income in 2020  among recipients ($)": "Individual_Median_Income",
    "Average total income in 2020 among recipients ($)": "Individual_Average_Income",
    "Number of persons in private households": "Population",
    "One-census-family households without additional persons": "h_one_census",
    "Couple-family households": "h_couple",
    "One-parent-family households": "h_one_parent",
    "Multigenerational households": "h_multigen",
    "Multiple-census-family households": "h_multiple",
    "One-census-family households with additional persons": "h_one_census_plus",
    "Two-or-more-person non-census-family households": "h_two_plus_non_census",
    "Average household size": "Average_Household_Size",
    "Renter": "Number_of_Rental_Properties",
    "Total - Labour force aged 15 years and over by class of worker including job permanency - 25% sample data": "Total_Labour_Force",
    "Permanent position": "Permanent_Job_Position",
    "48-49 Transportation and warehousing": "Transportation_Services_Position",
    "62 Health care and social assistance": "Healthcare_Services_Position",
}
_HOUSEHOLD_COLUMNS = [
    "h_multiple",
    "h_one_census",
    "h_couple",
    "h_one_parent",
    "h_multigen",
    "h_one_census_plus",
    "h_two_plus_non_census",
]
# Seven spelling fixes, applied as regular expressions exactly as R's gsub did
# (the "." in "St. James" matches any character there too).
NEIGHBOURHOOD_FIXES = [
    ("O`Connor Parkview", "O'Connor-Parkview"),
    ("Danforth-East York", "Danforth East York"),
    ("Taylor Massey", "Taylor-Massey"),
    ("East End Danforth", "East End-Danforth"),
    ("Cabbagetown-South St. James Town", "Cabbagetown-South St.James Town"),
    ("North St. James Town", "North St.James Town"),
    ("Yonge-St. Clair", "Yonge-St.Clair"),
]
JSC370_CENSUS_FEATURES = [
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
JSC370_COLUMNS = [
    "Robbery",
    "Month",
    "Day_Of_Week_Numeric",
    "Hour",
    "Premises_Type",
    "Longitude",
    "Latitude",
    "Season",
    "Darkness",
    *JSC370_CENSUS_FEATURES,
]


def jsc370_census(path: Path | None = None) -> pd.DataFrame:
    """``income_2020`` after the original's derivations and name fixes (158 neighbourhoods)."""
    census = read_census(path)
    inc = pd.DataFrame(
        {
            new: census_column(census, old).reset_index(drop=True)
            for old, new in _CENSUS_SELECT.items()
        }
    )
    for col in inc.columns.drop("Neighbourhood"):
        inc[col] = pd.to_numeric(inc[col], errors="raise").astype("float64")
    # rowSums(..., na.rm = TRUE) over the seven (overlapping) household columns is computed
    # by the original but never used as a feature; kept out of the output on purpose.
    inc["Permanent_Job_and_Labour_Force_Ratio"] = (
        inc["Permanent_Job_Position"] / inc["Total_Labour_Force"]
    )
    inc["Transportation_Service_Worker_and_Population_Ratio"] = (
        inc["Transportation_Services_Position"] / inc["Population"]
    )
    inc["HealthCare_Service_Worker_and_Population_Ratio"] = (
        inc["Healthcare_Services_Position"] / inc["Population"]
    )
    inc["Difference_in_Individual_Median_Average_Income"] = (
        inc["Individual_Average_Income"] - inc["Individual_Median_Income"]
    ).abs()
    inc = inc.drop(columns=_HOUSEHOLD_COLUMNS)
    for old, new in NEIGHBOURHOOD_FIXES:
        inc["Neighbourhood"] = inc["Neighbourhood"].map(lambda v, o=old, n=new: re.sub(o, n, v))
    return inc


def _r_sorted(order: list[int], names: list[str]) -> list[int]:
    """Stable sort of row positions by name in code-point order. R's order() ran under
    en_CA.UTF-8 on the reference machine, where that locale sorts these names exactly like code
    points (the reference re-run gives the same table under LC_COLLATE=C, parity/PARITY.md), so
    the result does not depend on the C library's locale data."""
    return sorted(order, key=lambda i: names[i])


def _isort_with_index(codes: list[int], index: list[int]) -> None:
    """R's ``isort_with_index`` (src/main/sort.c): an unstable Shell sort that merge() uses on
    the key codes. Its tie order is what puts rows of one neighbourhood in R's order."""
    n = len(codes)
    h = 1
    while h <= n // 9:
        h = 3 * h + 1
    while h > 0:
        for i in range(h, n):
            v, iv, j = codes[i], index[i], i
            while j >= h and codes[j - h] > v:
                codes[j], index[j] = codes[j - h], index[j - h]
                j -= h
            codes[j], index[j] = v, iv
        h //= 3


def r_left_merge_order(x_keys: list[str], y_keys: list[str]) -> list[int]:
    """Row order of R's ``merge(x, y, by = key, all.x = TRUE)`` for unique ``y_keys``: x rows
    ordered by the internal merge, then stably by key under R's collation (``sort = TRUE``)."""
    if len(set(y_keys)) != len(y_keys):
        raise ValueError(
            "r_left_merge_order needs unique y keys (one census row per neighbourhood)"
        )
    in_y = set(y_keys)
    matched = [k for k in x_keys if k in in_y]
    first_pos: dict[str, int] = {}
    for pos, k in enumerate(matched, start=1):
        first_pos.setdefault(k, pos)
    codes = [first_pos.get(k, 0) for k in x_keys]
    index = list(range(len(x_keys)))
    _isort_with_index(codes, index)
    lone = sum(1 for c in codes if c == 0)  # x rows without a census match, appended last
    order = index[lone:] + index[:lone]
    return _r_sorted(order, x_keys)


def jsc370_legacy(
    raw_dir: Path = RAW_DIR,
    drop_dst_gap_rows: bool = True,
    dow_sunday_first: bool = True,
    keep_neighbourhood: bool = False,
    na_omit_before_merge: bool = True,
) -> pd.DataFrame:
    """R's ``final_data`` (or ``merged_data`` with ``keep_neighbourhood``): 2020 incidents with
    a known neighbourhood, left-joined to the census features, sorted by neighbourhood.
    Quirk kept: the join uses the census table before ``na.omit``, so census gaps stay as NA.

    ``na_omit_before_merge`` selects which original is reproduced: True is ``Final_Project.Rmd``
    (incomplete rows are dropped before the merge); False is the refreshed branch's widget
    builder (they are dropped after it). The set of rows is the same, but R's merge() orders
    rows inside a neighbourhood by a Shell sort that depends on how many rows it saw, so the
    row order differs."""
    crime = _legacy_stack(raw_dir)
    month = month_from_name(crime["OCC_MONTH"])
    when = _occurrence_time(crime, month, drop_dst_gap_rows)
    iso = when.dt.isocalendar().day.astype("float64")
    dow = ((iso % 7) + 1 if dow_sunday_first else iso).where(when.notna())
    frame = pd.DataFrame(
        {
            "Robbery": (crime["MCI_CATEGORY"] == "Robbery").where(crime["MCI_CATEGORY"].notna()),
            "Occurrence_Time": when,
            "Year": crime["OCC_YEAR"],
            "Month": month,
            "Day_Of_Week_Numeric": dow,
            "Hour": crime["OCC_HOUR"],
            "Neighbourhood": crime["NEIGHBOURHOOD_158"],
            "Location_Type": crime["LOCATION_TYPE"],
            "Premises_Type": crime["PREMISES_TYPE"],
            "Longitude": crime["LONG_WGS84"],
            "Latitude": crime["LAT_WGS84"],
            "Season": season(month),
            "Darkness": darkness_fixed(crime["OCC_HOUR"]),
        }
    )
    # subset(Year == 2020), subset(Neighbourhood != "NSA"), then na.omit; NA conditions drop rows.
    frame = frame[(frame["Year"] == JSC370_YEAR) & (frame["Neighbourhood"] != NSA)]
    required = [
        "Robbery", "Occurrence_Time", "Month", "Day_Of_Week_Numeric", "Hour", "Neighbourhood",
        "Location_Type", "Premises_Type", "Longitude", "Latitude", "Season", "Darkness",
    ]  # fmt: skip
    if na_omit_before_merge:
        frame = frame.dropna(subset=required)
    census = jsc370_census()
    merged = frame.merge(census, on="Neighbourhood", how="left", sort=False)  # keeps frame order
    order = r_left_merge_order(merged["Neighbourhood"].tolist(), census["Neighbourhood"].tolist())
    merged = merged.iloc[order].reset_index(drop=True)
    if not na_omit_before_merge:
        merged = merged.dropna(
            subset=[*required, *census.columns.drop("Neighbourhood")]
        ).reset_index(drop=True)
    cols = (["Neighbourhood"] if keep_neighbourhood else []) + JSC370_COLUMNS
    out = merged[cols].copy()
    out["Robbery"] = out["Robbery"].astype(bool)
    return out


# --- unified table ---------------------------------------------------------------------------

UNIFIED_FILES = {
    "auto_theft": "Auto Theft",
    "break_enter": "Break and Enter",
    "robbery": "Robbery",
    "theft_over": "Theft Over",
}
UNIFIED_COLUMNS = [
    "event_id",
    "category",
    "robbery",
    "date",
    "year",
    "month",
    "weekday",
    "hour",
    "neighbourhood",
    "neighbourhood_known",
    "location_type",
    "premises_type",
    "longitude",
    "latitude",
]
# Fields that define an exact duplicate row (within a category).
_RETAINED = [
    c for c in UNIFIED_COLUMNS if c not in ("year", "month", "weekday", "neighbourhood_known")
]
CROSS_CATEGORY_RULES = ("drop_label_conflicts", "keep_all", "drop_all_multi")


def unified(
    raw_dir: Path = RAW_DIR, cross_category: str = "drop_label_conflicts"
) -> tuple[pd.DataFrame, dict]:
    """The clean shared table: robbery vs Auto Theft / Break and Enter / Theft Over, occurrence
    years 2014-2023 (PLAN.md section 2). Returns the table and an exclusion ledger.

    Cross-category rule (an EVENT_UNIQUE_ID can appear in more than one MCI file):
    ``drop_label_conflicts`` (default) drops every row of an event that has both a Robbery row
    and a non-Robbery row, because one incident would otherwise be labelled positive and
    negative. Events spread over several negative categories keep their rows (the binary label
    is unambiguous) and are counted in the ledger. ``keep_all`` and ``drop_all_multi`` exist
    to show the effect of the choice."""
    if cross_category not in CROSS_CATEGORY_RULES:
        raise ValueError(f"cross_category must be one of {CROSS_CATEGORY_RULES}")
    ledger: dict = {"steps": [], "cross_category_rule": cross_category}

    def log(step: str, frame: pd.DataFrame) -> None:
        ledger["steps"].append(
            {
                "step": step,
                "rows": len(frame),
                "by_category": frame["category"].value_counts().to_dict(),
            }
        )

    parts = []
    for key, label in UNIFIED_FILES.items():
        raw = read_text_csv(raw_dir / RAW_FILES[key])
        if set(raw["MCI_CATEGORY"]) != {label}:
            raise ValueError(f"{RAW_FILES[key]} holds unexpected MCI_CATEGORY values")
        hour = as_num(raw["OCC_HOUR"], "OCC_HOUR")
        premises = as_char(raw["PREMISES_TYPE"])
        parts.append(
            pd.DataFrame(
                {
                    "event_id": as_char(raw["EVENT_UNIQUE_ID"]),
                    "category": label,
                    "_year": as_num(raw["OCC_YEAR"], "OCC_YEAR"),
                    "_month": month_from_name(as_char(raw["OCC_MONTH"])),
                    "_day": as_num(raw["OCC_DAY"], "OCC_DAY"),
                    "hour": hour,
                    "neighbourhood": as_char(raw["NEIGHBOURHOOD_158"]),
                    "location_type": as_char(raw["LOCATION_TYPE"]),
                    "premises_type": premises,
                    "longitude": as_num(raw["LONG_WGS84"], "LONG_WGS84"),
                    "latitude": as_num(raw["LAT_WGS84"], "LAT_WGS84"),
                }
            )
        )
    df = pd.concat(parts, ignore_index=True)
    log("source rows", df)

    df["date"] = calendar_date(df["_year"], df["_month"], df["_day"])
    df = df[df["date"].notna() & df["_year"].between(YEAR_MIN, YEAR_MAX)].copy()
    log(f"valid calendar date, occurrence year {YEAR_MIN}-{YEAR_MAX}", df)
    df = df[df["hour"].isin(range(24)) & df["event_id"].notna() & (df["event_id"] != "")].copy()
    log("hour 0-23 and event id present", df)
    present = df["premises_type"].notna() & (df["premises_type"].str.strip() != "")
    df = df[present].copy()
    log("premises present", df)
    df = df[df["neighbourhood"].notna()].copy()
    log("neighbourhood recorded (NSA kept and flagged)", df)
    inside = df["longitude"].between(*LON_RANGE, inclusive="neither") & df["latitude"].between(
        *LAT_RANGE, inclusive="neither"
    )
    df = df[inside].copy()
    log("coordinates inside the Toronto box", df)

    df["year"] = df["date"].dt.year.astype("int64")
    df["month"] = df["date"].dt.month.astype("int64")
    df["weekday"] = df["date"].dt.isocalendar().day.astype("int64")
    df["hour"] = df["hour"].astype("int64")
    df["location_type"] = df["location_type"].fillna("Unknown")
    df["neighbourhood_known"] = df["neighbourhood"] != NSA
    df["robbery"] = (df["category"] == POSITIVE).astype("int8")

    df = df.drop_duplicates(subset=_RETAINED).copy()
    log("exact duplicates within category removed", df)

    cats = df.groupby("event_id")["category"].agg(["nunique", lambda s: (s == POSITIVE).any()])
    cats.columns = ["n_categories", "has_robbery"]
    multi = cats[cats["n_categories"] > 1]
    has_negative = df.groupby("event_id")["robbery"].min() == 0
    conflicts = multi.index[multi["has_robbery"] & has_negative.reindex(multi.index)]
    ledger["cross_category"] = {
        "events_in_more_than_one_category": len(multi),
        "events_with_robbery_and_other": len(conflicts),
        "events_only_among_negative_categories": int(len(multi) - len(conflicts)),
    }
    if cross_category == "drop_label_conflicts":
        df = df[~df["event_id"].isin(conflicts)]
    elif cross_category == "drop_all_multi":
        df = df[~df["event_id"].isin(multi.index)]
    log(f"cross-category rule: {cross_category}", df)

    ledger["events_with_repeated_rows"] = int((df.groupby("event_id").size() > 1).sum())
    ledger["classes"] = list(CLASSES)
    df = df.sort_values(["date", "hour", "event_id", "category"], kind="stable", ignore_index=True)
    return df[UNIFIED_COLUMNS], ledger
