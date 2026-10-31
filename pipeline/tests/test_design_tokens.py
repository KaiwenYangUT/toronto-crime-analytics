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


def test_type_scale_and_layout_tokens():
    from tca.figures.theme import load_tokens

    t = load_tokens()
    sizes = {k: v["size"] for k, v in t["type"]["scale"].items()}
    assert sizes == {
        "xs": 14,
        "sm": 16,
        "base": 18,
        "lg": 22,
        "xl": 28,
        "2xl": 34,
        "3xl": 44,
        "display": 56,
    }
    assert t["type"]["scale_mobile"]["base"]["size"] == 17
    assert t["layout"] == {
        "page_max": 1280,
        "gutter": 32,
        "gutter_mobile": 16,
        "aside": 360,
        "target": 44,
    }
    css = (ROOT / "web/src/styles/tokens.css").read_text()
    assert "--text-base: 1.125rem;" in css  # 18 px
    assert "--text-base: 1.0625rem;" in css  # 17 px, inside the max-width: 767.98px block
    assert "--page-max: 1280px;" in css and "--target: 44px;" in css


def test_magnitude_ramp_runs_the_right_way_in_each_theme():
    from tca.figures.theme import load_tokens

    t = load_tokens()["color"]
    light, dark = t["light"]["ramp"]["magnitude"], t["dark"]["ramp"]["magnitude"]
    assert (light[0], light[-1]) == ("#FDE725", "#440154")  # high counts are dark on white
    assert (dark[0], dark[-1]) == ("#440154", "#FDE725")  # high counts are bright on dark
    assert light == dark[::-1]


def test_paper_theme_is_pinned_to_the_pre_p10_sizes():
    import json

    from tca.figures.theme import load_tokens, vega_themes

    themes = vega_themes(load_tokens())
    assert set(themes) == {"light", "dark", "paper"}
    paper = themes["paper"]
    assert paper["axis"]["labelFontSize"] == 12.8 and paper["axis"]["titleFontSize"] == 14
    assert paper["legend"]["labelFontSize"] == 14 and paper["text"]["fontSize"] == 12.8
    assert paper["title"]["fontSize"] == 20 and paper["title"]["subtitleFontSize"] == 14
    assert "magnitude" not in paper["range"]
    # the site theme gets the larger chart text, with the same colours as paper
    site = themes["light"]
    assert site["axis"]["labelFontSize"] == 14 and site["axis"]["titleFontSize"] == 15
    assert site["legend"]["labelFontSize"] == 15 and site["text"]["fontSize"] == 14
    site_colours = {k: v for k, v in site.items() if k in ("background", "range", "style")}
    paper_colours = {k: v for k, v in paper.items() if k in ("background", "range", "style")}
    site_colours["range"] = {k: v for k, v in site_colours["range"].items() if k != "magnitude"}
    assert json.dumps(site_colours, sort_keys=True) == json.dumps(paper_colours, sort_keys=True)
    # gen_paper must read the pinned block
    assert '["paper"]' in (ROOT / "tools/gen_paper.py").read_text()
