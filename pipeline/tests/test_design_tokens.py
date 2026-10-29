"""design/tokens.json: palette checks pass, generated files are current, validator parity."""

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]


def _load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture(scope="module")
def check():
    return _load("check_palette")


def test_no_palette_check_fails(check):
    from tca.figures.theme import load_tokens

    report = check.run(load_tokens())
    assert [(t, r) for t, rows in report.items() for r in rows if r[1] == "FAIL"] == []


def test_port_matches_the_dataviz_validator(check):
    # numbers printed by the skill's validate_palette.js for the same hexes
    assert check.delta_e("#CC79A7", "#009E73", "deutan") == pytest.approx(7.6, abs=0.05)
    assert check.delta_e("#CC79A7", "#D55E00") == pytest.approx(16.4, abs=0.05)
    assert check.delta_e("#8C6D1F", "#D55E00", "protan") == pytest.approx(
        1.8, abs=0.05
    )  # the rejected ochre
    assert check.delta_e("#6A3D9A", "#0072B2", "deutan") == pytest.approx(6.9, abs=0.05)


def test_robbery_is_the_only_warm_saturated_hue(check):
    from tca.figures.theme import load_tokens

    for mode in ("light", "dark"):
        cats = load_tokens()["color"][mode]["category"]
        warm = []
        for k, v in cats.items():
            if k == "other":
                continue
            import math

            _, a, b = check.oklab_from_linear(check.lin(v))
            if math.hypot(a, b) >= 0.1 and a > 0 and b > 0.05:
                warm.append(k)
        assert warm == ["robbery"], (mode, warm)


def test_generated_files_are_current():
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools/gen_tokens.py"), "--check"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout
