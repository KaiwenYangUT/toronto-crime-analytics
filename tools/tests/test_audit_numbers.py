"""The honesty audit must flag a numeral that is not a stored result value and pass one that is."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import audit_numbers as an


def test_flags_unknown_numbers_and_passes_known_ones():
    known = an.result_strings()
    good = "The post-2019 odds ratio is 0.55 (interval 0.52 to 0.58) in 159,056 incidents, 95% CI, 2014 to 2023."
    bad = "The odds ratio is 0.0777 across 17,001 incidents."
    assert not {"0.0777", "17,001", "0.6"} & known
    assert an.audit({"p": good}, known, "site") == []
    assert {tok for _, tok, _ in an.audit({"p": bad}, known, "site")} == {"0.0777", "17,001"}


def test_rounding_up_is_flagged():
    known = an.result_strings()
    assert [
        t for _, t, _ in an.audit({"p": "A ratio of 0.6 (0.546 stored as 0.55)"}, known, "site")
    ] == ["0.6"]
