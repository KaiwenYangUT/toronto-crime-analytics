"""The Explore legacy bundle: layout, size budget and determinism."""

import gzip
import json
from pathlib import Path

import numpy as np
import pytest
from tca.explore.export import COLUMNS, OUT_DIR, build_arrays, write_legacy_bundle

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def meta():
    return write_legacy_bundle()


def test_layout_is_aligned_and_complete(meta):
    blob = (OUT_DIR / "legacy.bin").read_bytes()
    assert len(blob) == meta["bytes"] == meta["n"] * 27 == 25_242 * 27
    sizes = {name: np.dtype(dtype).itemsize for name, dtype in COLUMNS}
    for col in meta["columns"]:
        assert col["offset"] % sizes[col["name"]] == 0, col
    assert [c["name"] for c in meta["columns"]] == [n for n, _ in COLUMNS]


def test_within_the_gzip_budget(meta):
    assert len(gzip.compress((OUT_DIR / "legacy.bin").read_bytes(), 9)) <= 600_000
    assert meta["gzip_bytes"] <= 600_000


def test_bundle_is_deterministic(meta):
    first = json.loads((OUT_DIR / "meta.json").read_text())["sha256"]
    again = write_legacy_bundle()["sha256"]
    assert first == again == meta["sha256"]


def test_roundtrip_values():
    from tca.build import explore_legacy

    events, _ = explore_legacy()
    arrays, dictionaries = build_arrays(events)
    assert dictionaries["category"] == ["Bicycle theft", "Robbery", "Theft over"]
    assert (arrays["lon"] == events["longitude"].to_numpy()).all()
    assert arrays["event_class"].max() + 1 == events["event_id"].nunique()
    days = (events["date"] - np.datetime64("1970-01-01")).dt.days
    assert (arrays["day"].astype(int) == days).all()


def test_v2_bundle_shares_the_legacy_event_classes():
    from tca.build import explore_legacy
    from tca.definitions import EXPLORE_SPEC_V2
    from tca.explore.export import write_v2_bundle

    v2 = write_v2_bundle()
    legacy, _ = explore_legacy()
    extra, _ = explore_legacy(spec=EXPLORE_SPEC_V2)
    assert v2["n"] == len(extra)
    assert v2["gzip_bytes"] <= 2_000_000
    assert v2["dictionaries"]["category"] == ["Auto theft", "Break and enter"]
    blob = np.frombuffer(
        (OUT_DIR / "v2.bin").read_bytes(),
        dtype="<u4",
        count=v2["n"],
        offset=v2["columns"][2]["offset"],
    )
    legacy_ids = sorted(legacy["event_id"].unique())
    rank = {v: i for i, v in enumerate(legacy_ids)}
    shared = extra["event_id"].isin(rank).to_numpy()
    assert shared.any()
    assert (blob[shared] == extra["event_id"][shared].map(rank).to_numpy()).all()
    assert (blob[~shared] >= len(legacy_ids)).all()
    assert int(blob.max()) + 1 <= v2["n_event_classes"]
    # the same event ID always has the same class, inside the bundle too
    assert extra.assign(c=blob).groupby("event_id")["c"].nunique().max() == 1
