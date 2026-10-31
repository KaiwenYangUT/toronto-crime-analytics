"""The census scatter results: values equal the arrays of the R-built Figure 1 widget."""

import hashlib
import json
import lzma
from pathlib import Path

import numpy as np
import pytest
from tca.explain import census_scatter as cs
from tca.results import RESULTS_DIR, canonical

ROOT = Path(__file__).resolve().parents[2]
CHARTS = ROOT / "parity/r_outputs/charts/chart_data.json.xz"
pytestmark = pytest.mark.skipif(
    not CHARTS.exists() or not (ROOT / "data/raw").exists(),
    reason="needs the R chart export and the raw data",
)


def identity(values: dict) -> str:
    text = canonical({"_provenance": {"key": "predict.census_scatter"}, "values": values})
    return hashlib.sha256(text.encode()).hexdigest()


@pytest.fixture(scope="module")
def values():
    return cs.run(write=False)


@pytest.fixture(scope="module")
def widget():
    with lzma.open(CHARTS, "rt", encoding="utf8") as fh:
        return json.load(fh)["figure1.html"][0]["traces"][0]


def test_points_equal_the_r_widget_arrays_in_order(values, widget):
    pts = values["points"]
    assert [p["ratio"] for p in pts] == widget["x"]
    assert [p["income"] for p in pts] == widget["y"]
    assert [p["robberies"] for p in pts] == widget["z"]
    # the widget's hover text names each neighbourhood in the same order
    assert all(
        t.startswith(f"Neighbourhood: {p['name']} <br>")
        for p, t in zip(pts, widget["text"], strict=True)
    )


def test_names_sorted_by_code_point_and_unique(values):
    names = [p["name"] for p in values["points"]]
    assert names == sorted(names)
    assert len(set(names)) == len(names) == 158


def test_identity_hash_is_stable_across_two_runs(values):
    assert identity(values) == identity(cs.run(write=False))


def test_committed_file_matches_a_fresh_run(values):
    doc = json.loads((RESULTS_DIR / "predict" / "predict.census_scatter.json").read_text())
    assert doc["values"] == json.loads(json.dumps(values))


def test_summary_is_consistent_with_the_points(values):
    s, pts = values["summary"], values["points"]
    z = np.array([p["robberies"] for p in pts])
    assert s["n"] == len(pts) == 158
    assert s["total_robberies"] == int(z.sum()) == 2779
    assert s["top_decile"]["n"] + s["rest"]["n"] == s["n"]
    assert s["top_decile"]["n"] == int((z >= s["top_decile"]["threshold"]).sum())
    assert s["max"] == {"name": pts[int(z.argmax())]["name"], "robberies": int(z.max())}
    assert values["axes"]["robberies_max"] == s["max"]["robberies"]
    for k in ("spearman_income", "spearman_ratio"):
        assert -1 <= s[k]["rho"] <= 1 and 0 <= s[k]["p"] <= 1
    # the caption check: income relates weakly and negatively, the job ratio not at all
    assert s["spearman_income"]["rho"] < 0 and s["spearman_income"]["p"] < 0.05
    assert s["spearman_ratio"]["p"] > 0.05
    assert s["top_decile"]["median_income"] < s["rest"]["median_income"]
