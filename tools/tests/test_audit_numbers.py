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


def test_census_points_do_not_widen_the_known_set(monkeypatch):
    with_points = (monkeypatch.setattr(an, "SKIP_REFS", set()), an.result_strings())[1]
    monkeypatch.undo()
    known = an.result_strings()
    leaked = with_points - known
    assert leaked, "the points subtree should contribute strings when it is not skipped"
    n = len(an.gp.RESULTS["predict.census_scatter"]["points"])
    assert n == 158 and len(leaked) > 100  # incomes, ratios and counts of 158 neighbourhoods
    assert an.gp.fmt("predict.census_scatter:summary.n") in known  # the summary is still citable
    # a small integer that only a point carries is flagged in prose
    counts = {str(p["robberies"]) for p in an.gp.RESULTS["predict.census_scatter"]["points"]}
    only_points = sorted(c for c in counts if c in leaked)
    assert only_points
    flagged = an.audit({"p": f"There were {only_points[0]} robberies here."}, known, "site")
    assert [t for _, t, _ in flagged] == [only_points[0]]


def test_paper_cut_drops_the_references_page_after_a_clearpage():
    body = "Discussion text 42.\n\n7\n\f"
    refs = "References\n[1] A. Author. 2021. 99 pages.\n\n8\n\f"
    cut = an.cut_references(body + refs)
    assert "99" not in cut and "References" not in cut
    assert "Discussion text 42." in cut


def test_paper_cut_keeps_the_fallback_for_a_heading_inside_a_page():
    text = "Body 1.\nMore body.\nReferences\n[1] 77\n\f"
    assert an.cut_references(text) == "Body 1.\nMore body."


def test_paper_cut_leaves_text_without_references_alone():
    assert an.cut_references("Body.\n\f2\n\f") == "Body.\n\f2\n\f"
