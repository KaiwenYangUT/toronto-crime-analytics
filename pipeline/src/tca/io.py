"""Reading the raw inputs the way the R originals read them.

CSVs are read as text first (UTF-8 with BOM) and converted per column, so the R reader's
rules are explicit: a character column treats the literal ``NA`` as missing, a numeric
column treats ``NA`` and blank as missing, and anything else is an error.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from tca.definitions import CENSUS_FILE, RAW_FILES

ROOT = Path(__file__).resolve().parents[3]
RAW_DIR = ROOT / "data" / "raw"


def raw_path(key_or_name: str, raw_dir: Path = RAW_DIR) -> Path:
    return raw_dir / RAW_FILES.get(key_or_name, key_or_name)


def read_text_csv(path: Path) -> pd.DataFrame:
    """All columns as strings; nothing is interpreted as missing yet."""
    return pd.read_csv(
        path, dtype=str, keep_default_na=False, na_filter=False, encoding="utf-8-sig"
    )


def as_char(col: pd.Series) -> pd.Series:
    """R read.csv character column: ``NA`` is missing, blank stays blank."""
    return col.where(col != "NA", None).astype(object)


def as_num(col: pd.Series, name: str = "") -> pd.Series:
    """R read.csv numeric column: ``NA`` and blank are missing; other text is an error."""
    blank = col.isin(["", "NA"])
    out = pd.to_numeric(col.where(~blank, None), errors="raise")
    if out.isna().sum() != blank.sum():
        raise ValueError(f"unexpected non-numeric values in {name or col.name}")
    return out.astype("float64")


def read_census(path: Path | None = None) -> pd.DataFrame:
    """The neighbourhood-profile workbook, first sheet. Header cells are trimmed like readxl's
    ``trim_ws`` (the file indents sub-rows with spaces); names may still repeat elsewhere in the
    sheet, so select columns with ``census_column``."""
    raw = pd.read_excel(path or raw_path(CENSUS_FILE), sheet_name=0, engine="openpyxl", header=None)
    frame = raw.iloc[1:].reset_index(drop=True)
    frame.columns = [h.strip() if isinstance(h, str) else h for h in raw.iloc[0]]
    return frame


def census_column(census: pd.DataFrame, name: str) -> pd.Series:
    """One column by trimmed header; fails if the name is missing or repeated (R would too)."""
    hits = census.loc[:, census.columns == name]
    if hits.shape[1] != 1:
        raise KeyError(f"census header {name!r} matched {hits.shape[1]} columns")
    return hits.iloc[:, 0]
