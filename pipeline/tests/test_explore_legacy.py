"""explore_legacy must equal the R Explorer's rebuilt crime.rds (exported in P2)."""

import json
import struct
from pathlib import Path

import pandas as pd
import pytest
from tca.build import explore_legacy

ROOT = Path(__file__).resolve().parents[2]
R_EVENTS = ROOT / "parity/r_outputs/explorer/events_hex.csv.gz"
pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def built():
    return explore_legacy()


@pytest.fixture(scope="module")
def r_events():
    return pd.read_csv(R_EVENTS, dtype=str, keep_default_na=False)


def _bits(x: float) -> int:
    return struct.unpack("<q", struct.pack("<d", x))[0]


def test_row_count_and_text_columns(built, r_events):
    py, _ = built
    assert len(py) == len(r_events) == 25_242
    for col in ("event_id", "category", "status", "location_type", "premises_type"):
        assert (py[col].values == r_events[col].values).all(), col


def test_dates_hours_weekdays(built, r_events):
    py, _ = built
    assert (py["date"].dt.strftime("%Y-%m-%d").values == r_events["date"].values).all()
    assert (py["hour"].values == r_events["hour"].astype(int).values).all()
    assert (py["weekday"].values == r_events["weekday"].astype(int).values).all()


@pytest.mark.parametrize("col", ["longitude", "latitude"])
def test_coordinates_are_bit_equal(built, r_events, col):
    py, _ = built
    r_values = [float.fromhex(h) for h in r_events[col + "_hex"]]
    assert all(_bits(a) == _bits(b) for a, b in zip(r_values, py[col]))


def test_per_file_manifest(built):
    _, manifest = built
    r_manifest = json.loads((ROOT / "parity/r_outputs/explorer/manifest.json").read_text())
    for filename, got in manifest.items():
        want = {k: (v[0] if isinstance(v, list) else v) for k, v in r_manifest[filename].items()}
        assert {k: want[k] for k in got} == got, filename


def test_validation_md_counts(built):
    py, _ = built
    counts = py["category"].value_counts().to_dict()
    assert counts == {"Bicycle theft": 11_484, "Robbery": 8_455, "Theft over": 5_303}
