"""sta303_legacy must equal the STA303 model frame from the R re-run (exported in P2)."""

import importlib.util
from pathlib import Path

import pytest
from tca.build import sta303_legacy

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def report():
    spec = importlib.util.spec_from_file_location("cmp", ROOT / "parity/compare/compare_sta303.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.compare()


def test_matches_r_model_frame(report):
    assert report["rows_r"] == report["rows_py"] == 174_976
    assert all(v is True for k, v in report.items() if k.endswith("_equal"))
    assert all(v == 0 for k, v in report.items() if k.endswith("_bit_differences"))


def test_class_counts(report):
    assert report["class_counts"] == {
        "Robbery": 33_919,
        "Auto Theft": 58_434,
        "Break and Enter": 70_143,
        "Theft Over": 12_480,
    }


def test_named_flags_change_the_output():
    base = sta303_legacy()
    assert len(sta303_legacy(drop_dst_gap_rows=False)) > len(base)
    iso = sta303_legacy(dow_sunday_first=False)
    assert sorted(iso["Day_Of_Week_Numeric"].unique()) == [1, 2, 3, 4, 5, 6, 7]
    assert (iso["Day_Of_Week_Numeric"] != base["Day_Of_Week_Numeric"]).any()
