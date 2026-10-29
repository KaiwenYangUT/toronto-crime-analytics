"""jsc370_legacy must equal R's final_data from the pinned re-run (exported in P2)."""

import importlib.util
import re
from pathlib import Path

import pytest
from tca.build import (
    NEIGHBOURHOOD_FIXES,
    jsc370_census,
    jsc370_legacy,
    r_collation_available,
    r_left_merge_order,
)
from tca.io import read_census

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def report():
    spec = importlib.util.spec_from_file_location("cmp", ROOT / "parity/compare/compare_jsc370.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.compare()


def test_matches_r_final_data(report):
    assert report["rows_r"] == report["rows_py"] == 16_611
    assert report["robberies_r"] == report["robberies_py"] == 2_779
    assert report["key_multiset_equal"]
    assert report["neighbourhoods_matched"] == 158


@pytest.mark.skipif(not r_collation_available(), reason="needs the en_CA.UTF-8 locale")
def test_row_order_matches_r(report):
    assert report["row_order_equal"]


def test_census_features_match_to_1e12(report):
    assert all(v <= 1e-12 for k, v in report.items() if k.endswith("_max_rel_diff"))


def test_census_table_has_158_unique_neighbourhoods():
    census = jsc370_census()
    assert len(census) == 158 and census["Neighbourhood"].is_unique


def test_every_spelling_fix_matches_a_census_name_and_changes_it():
    raw_names = set(read_census()["Neighbourhood Name"])
    fixed_names = set(jsc370_census()["Neighbourhood"])
    for old, new in NEIGHBOURHOOD_FIXES:
        assert any(re.search(old, n) for n in raw_names), old
        assert any(re.search(old, n) is None and new in n for n in fixed_names), new
    crime_names = set(jsc370_legacy(keep_neighbourhood=True)["Neighbourhood"])
    assert crime_names <= fixed_names and len(crime_names) == 158


def test_merge_order_rejects_duplicate_census_keys():
    with pytest.raises(ValueError):
        r_left_merge_order(["a"], ["a", "a"])


def test_merge_order_is_stable_by_key_for_unique_codes():
    assert r_left_merge_order(["b", "a", "c"], ["a", "b", "c"]) == [1, 0, 2]
