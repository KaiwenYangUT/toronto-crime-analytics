"""Rules of the clean shared table (PLAN.md section 2)."""

import pandas as pd
import pytest
from tca import schema
from tca.build import explore_legacy, jsc370_legacy, sta303_legacy, unified
from tca.definitions import CLASSES, YEAR_MAX, YEAR_MIN
from tca.io import ROOT

pytestmark = pytest.mark.skipif(
    not (ROOT / "data/raw/Robbery_Open_Data.csv").exists(), reason="run `make data` first"
)


@pytest.fixture(scope="module")
def built():
    return unified()


def test_schema_validates(built):
    schema.UNIFIED.validate(built[0])


def test_legacy_tables_validate():
    schema.EXPLORE.validate(explore_legacy()[0])
    schema.STA303.validate(sta303_legacy())
    schema.JSC370.validate(jsc370_legacy())


def test_classes_and_window(built):
    df, _ = built
    assert set(df["category"]) == set(CLASSES)
    assert df["year"].between(YEAR_MIN, YEAR_MAX).all()


def test_no_exact_duplicates_within_category(built):
    df, _ = built
    keep = [c for c in df.columns if c not in ("year", "month", "weekday", "neighbourhood_known")]
    assert not df.duplicated(subset=["category", *keep]).any()
    assert not df.duplicated(subset=["category", "event_id"]).any()


def test_no_event_is_both_positive_and_negative(built):
    df, _ = built
    per_event = df.groupby("event_id")["robbery"].agg(["min", "max"])
    assert not ((per_event["min"] == 0) & (per_event["max"] == 1)).any()


def test_ledger_is_consistent(built):
    df, ledger = built
    steps = ledger["steps"]
    assert steps[0]["rows"] == 174_993 and steps[-1]["rows"] == len(df)
    rows = [s["rows"] for s in steps]
    assert rows == sorted(rows, reverse=True)
    for s in steps:
        assert sum(s["by_category"].values()) == s["rows"]
    assert ledger["cross_category"] == {
        "events_in_more_than_one_category": 1_580,
        "events_with_robbery_and_other": 350,
        "events_only_among_negative_categories": 1_230,
    }


def test_rule_changes_the_row_count():
    kept, _ = unified(cross_category="keep_all")
    default, _ = unified()
    strict, _ = unified(cross_category="drop_all_multi")
    assert len(kept) > len(default) > len(strict)
    with pytest.raises(ValueError):
        unified(cross_category="nonsense")


def test_final_counts_are_pinned(built):
    df, _ = built
    assert len(df) == 159_072
    assert df["category"].value_counts().to_dict() == {
        "Break and Enter": 69_111,
        "Auto Theft": 52_227,
        "Robbery": 25_661,
        "Theft Over": 12_073,
    }
    assert isinstance(df["date"].iloc[0], pd.Timestamp)
