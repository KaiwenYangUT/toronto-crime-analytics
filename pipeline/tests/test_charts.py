"""Chart checklist: the data behind every original JSC370 chart equals the R-built widgets."""

import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(
    not (ROOT / "parity/r_outputs/charts/chart_data.json.xz").exists(),
    reason="needs the R chart export",
)


@pytest.fixture(scope="module")
def report():
    spec = importlib.util.spec_from_file_location("cmp", ROOT / "parity/compare/compare_charts.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod, mod.compare()


def test_every_chart_check_is_equal(report):
    mod, rep = report
    checks = dict(mod.flat(rep))
    assert len(checks) >= 80
    assert [k for k, v in checks.items() if v is not True] == []


def test_widget_builder_row_order_differs_from_final_project():
    from tca.build import jsc370_legacy

    a = jsc370_legacy(keep_neighbourhood=True)
    b = jsc370_legacy(keep_neighbourhood=True, na_omit_before_merge=False)
    assert len(a) == len(b) == 16_611
    assert sorted(map(tuple, a.round(9).astype(str).to_numpy())) == sorted(
        map(tuple, b.round(9).astype(str).to_numpy())
    )
    assert not a.equals(b)
