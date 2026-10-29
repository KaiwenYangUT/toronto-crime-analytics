"""Compare tca.build.explore_legacy with R's crime.rds events (exported in P2).
Run: .venv/bin/python parity/compare/compare_explore.py"""

import json
import struct
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import explore_legacy

r = pd.read_csv(
    ROOT / "parity/r_outputs/explorer/events_hex.csv.gz", dtype=str, keep_default_na=False
)
py, manifest = explore_legacy()
print("rows R / Python:", len(r), len(py))
report = {"rows_r": len(r), "rows_py": len(py)}
for col in ("event_id", "category", "status", "location_type", "premises_type"):
    report[col + "_equal"] = bool((r[col].values == py[col].values).all())
report["date_equal"] = bool((r["date"].values == py["date"].dt.strftime("%Y-%m-%d").values).all())
report["hour_equal"] = bool((r["hour"].astype(int).values == py["hour"].values).all())
report["weekday_equal"] = bool((r["weekday"].astype(int).values == py["weekday"].values).all())


def bits(x: float) -> int:
    return struct.unpack("<q", struct.pack("<d", x))[0]


for col in ("longitude", "latitude"):
    r_hex = [float.fromhex(h) for h in r[col + "_hex"]]
    diff = sum(bits(a) != bits(b) for a, b in zip(r_hex, py[col]))
    report[col + "_bit_differences"] = diff
    report[col + "_max_ulp"] = max(
        (abs(bits(a) - bits(b)) for a, b in zip(r_hex, py[col])), default=0
    )
rm = json.loads((ROOT / "parity/r_outputs/explorer/manifest.json").read_text())
report["manifest_equal"] = all(
    {k: rm[f][k][0] if isinstance(rm[f][k], list) else rm[f][k] for k in manifest[f]} == manifest[f]
    for f in manifest
)
print(json.dumps(report, indent=1))
ok = (
    all(v is True for k, v in report.items() if k.endswith("_equal"))
    and all(report[k] == 0 for k in report if k.endswith(("_bit_differences", "_max_ulp")))
    and report["rows_r"] == report["rows_py"] == 25242
)
print("PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
