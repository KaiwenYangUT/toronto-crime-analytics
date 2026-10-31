"""tools/gen_paper.py must format numbers exactly like the site (web/src/lib/results.ts)."""

import json
import random
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import gen_paper  # noqa: E402

pytestmark = pytest.mark.skipif(shutil.which("node") is None, reason="node not installed")

FORMATS = [
    {"decimals": 0},
    {"decimals": 1, "percent": True},
    {"decimals": 2},
    {"decimals": 3},
    {"decimals": 0, "plain": True},
    {"p": True},
]


def cases() -> list[tuple[float, dict]]:
    rng = random.Random(303313)
    ties = [0.125, 1.005, 2.5, 0.0005, 0.045, 12.345, 159056, 0.9995, 1e-7, 0.10545470884255931, 2020]
    values = ties + [rng.uniform(-5, 5) for _ in range(150)] + [rng.uniform(0, 1) for _ in range(150)]
    return [(v, f) for v in values for f in FORMATS]


def test_python_formatting_matches_the_site():
    pairs = cases()
    script = (
        "import { formatNumber } from './web/src/lib/results.ts';"
        "const cs = JSON.parse(process.argv[1]);"
        "console.log(JSON.stringify(cs.map(([v, f]) => formatNumber(v, f))));"
    )
    out = subprocess.run(
        ["node", "--input-type=module", "-e", script, json.dumps(pairs)],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout
    expected = json.loads(out)
    got = [gen_paper.format_number(v, f) for v, f in pairs]
    bad = [(p, e, g) for p, e, g in zip(pairs, expected, got, strict=True) if e != g]
    assert not bad, bad[:5]
