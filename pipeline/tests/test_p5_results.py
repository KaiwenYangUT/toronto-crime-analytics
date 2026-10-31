"""P5 results: infrastructure, the committed results files and their registry."""

import json

import pytest
from tca import results
from tca.io import ROOT


def test_write_result_adds_provenance_and_registers(tmp_path, monkeypatch):
    monkeypatch.setattr(results, "RESULTS_DIR", tmp_path / "results")
    monkeypatch.setattr(results, "INDEX", tmp_path / "results" / "index.json")
    monkeypatch.setattr(results, "ROOT", tmp_path)
    path = results.write_result(
        "demo.key",
        "demo",
        {"a": 1.5},
        producer="test",
        description="d",
        formats={"a": {"decimals": 1}},
    )
    payload = json.loads(path.read_text())
    assert set(payload["_provenance"]) >= {
        "key",
        "producer",
        "git_sha",
        "seed",
        "inputs",
        "created",
    }
    assert payload["_provenance"]["seed"] == 303313 and payload["values"] == {"a": 1.5}
    index = json.loads((tmp_path / "results" / "index.json").read_text())
    assert index["demo.key"]["formats"] == {"a": {"decimals": 1}}


def test_identity_hash_ignores_volatile_fields_only():
    a = {"_provenance": {"created": "t1", "git_sha": "x", "seed": 1}, "values": {"v": 1}}
    b = {"_provenance": {"created": "t2", "git_sha": "y", "seed": 1}, "values": {"v": 1}}
    c = {"_provenance": {"created": "t1", "git_sha": "x", "seed": 2}, "values": {"v": 1}}
    assert results.canonical(a) == results.canonical(b) != results.canonical(c)


def test_nan_cannot_be_written(tmp_path, monkeypatch):
    monkeypatch.setattr(results, "RESULTS_DIR", tmp_path / "results")
    monkeypatch.setattr(results, "INDEX", tmp_path / "results" / "index.json")
    with pytest.raises(ValueError):
        results.write_result("bad", "demo", {"x": float("nan")}, producer="t", description="d")


needs_results = pytest.mark.skipif(
    not (ROOT / "results" / "index.json").exists(), reason="no results yet"
)


@needs_results
def test_every_registered_file_exists_and_checksums_are_current():
    index = json.loads((ROOT / "results" / "index.json").read_text())
    lines = (ROOT / "results" / "CHECKSUMS.sha256").read_text().strip().splitlines()
    recorded = {line.split("  ")[1]: line.split("  ")[0] for line in lines}
    assert len(index) == len(recorded) >= 5
    for key, entry in index.items():
        path = ROOT / entry["file"]
        assert path.exists(), key
        assert recorded[str(path.relative_to(ROOT / "results"))] == results.identity_hash(path), key
        assert json.loads(path.read_text())["_provenance"]["key"] == key


@needs_results
def test_results_files_hold_no_nan_and_are_small():
    for p in (ROOT / "results").rglob("*.json"):
        assert "NaN" not in p.read_text() and p.stat().st_size < 1_000_000


def _values(key):
    index = json.loads((ROOT / "results" / "index.json").read_text())
    return json.loads((ROOT / index[key]["file"]).read_text())["values"]


@needs_results
def test_grid_fix_compares_the_two_grids():
    v = _values("predict.xgb_grid_fix")
    assert v["as_run_caret_default"]["grid_size"] == 108 and v["as_intended"]["grid_size"] == 40
    assert v["as_intended"]["best"]["max_depth"] in (1, 3, 5, 7)
    assert v["as_intended"]["test"]["f1_mean"] > v["as_run_caret_default"]["test"]["f1_mean"]
    assert v["threshold"] == 0.5


@needs_results
def test_caption_evidence_is_internally_consistent():
    c = _values("predict.eda_corrections")["claims"]
    assert c["summer_rise"]["winter_robberies"] > c["summer_rise"]["summer_robberies"]
    assert (
        sum(c["weekend_peak"]["robberies_by_day"].values())
        == _values("predict.eda_corrections")["robberies"]
    )
    assert (
        sum(c["hourly_shape"]["incidents_by_hour"].values())
        == _values("predict.eda_corrections")["rows"]
    )
    assert all(v["contradicted"] for v in c.values())


@needs_results
def test_ablation_intervals_bracket_estimates_and_deltas_are_paired():
    abl = _values("predict.ablation")
    for d in abl["designs"].values():
        for v in d["variants"].values():
            for m in ("roc_auc", "pr_auc", "f1"):
                assert v[m]["lo"] <= v[m]["estimate"] <= v[m]["hi"]
        assert d["bootstrap_replicates"] == 1000 and d["clusters"] == 158
        # premises and location are by far the strongest block; time alone is weak
        assert d["variants"]["L2"]["roc_auc"]["lo"] > d["variants"]["L1"]["roc_auc"]["hi"] + 0.1
        assert (
            d["variants"]["L2"]["roc_auc"]["lo"]
            > d["variants"]["L2-nopremises"]["roc_auc"]["hi"] + 0.1
        )
        assert d["deltas"]["L2_minus_L1"]["roc_auc"]["lo"] > 0


@needs_results
def test_inference_vs_prediction_counts_match_the_sources():
    iv = _values("predict.inference_vs_prediction")
    inf = _values("explain.sta303_v2")
    assert iv["time_terms"] == 23 + 11 + 6 + 1
    assert iv["post2019_or"] == inf["post2019"]["or"]
    assert 0 < iv["time_terms_clear"] < iv["time_terms"]


def test_provenance_records_whether_the_code_was_dirty(tmp_path, monkeypatch):
    monkeypatch.setattr(results, "RESULTS_DIR", tmp_path / "results")
    monkeypatch.setattr(results, "INDEX", tmp_path / "results" / "index.json")
    monkeypatch.setattr(results, "code_dirty", lambda: True)
    path = results.write_result("dirty.key", "demo", {"a": 1}, producer="t", description="d")
    assert json.loads(path.read_text())["_provenance"]["code_dirty"] is True
    clean = {
        "_provenance": {"created": "x", "git_sha": "y", "code_dirty": False, "seed": 1},
        "values": {},
    }
    dirty = {
        "_provenance": {"created": "x", "git_sha": "y", "code_dirty": True, "seed": 1},
        "values": {},
    }
    assert results.canonical(clean) == results.canonical(dirty)  # not part of the value hash


@needs_results
def test_weekend_verdict_requires_both_parts_and_hour_verdict_either():
    c = _values("predict.eda_corrections")["claims"]
    parts = c["weekend_peak"]["claim_parts"]
    assert c["weekend_peak"]["contradicted"] == (not all(parts.values()))
    assert c["hourly_shape"]["contradicted"] == (
        c["hourly_shape"]["rises_between_1am_and_11am"] > 0
        or c["hourly_shape"]["rises_between_1pm_and_11pm"] > 0
    )


@needs_results
def test_the_headline_message_is_issued_only_when_its_criteria_hold():
    iv = _values("predict.inference_vs_prediction")
    assert all(iv["message_criteria"].values()) == iv["message"].startswith("Many time terms")


def test_identity_hash_ignores_wall_clock_timings():
    a = {
        "_provenance": {"seed": 1},
        "values": {"v": 1, "variants": {"L1": {"fit_seconds": 5.1, "x": 2}}},
    }
    b = {
        "_provenance": {"seed": 1},
        "values": {"v": 1, "variants": {"L1": {"fit_seconds": 9.9, "x": 2}}},
    }
    c = {
        "_provenance": {"seed": 1},
        "values": {"v": 1, "variants": {"L1": {"fit_seconds": 5.1, "x": 3}}},
    }
    assert results.canonical(a) == results.canonical(b) != results.canonical(c)
