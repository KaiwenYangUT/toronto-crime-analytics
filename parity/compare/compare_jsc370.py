"""Compare tca.build.jsc370_legacy with R's final_data (exported in P2).
The requirement is an exact multiset match; the port also reproduces R's row order (R's merge()
orders rows within a neighbourhood with an unstable Shell sort); census features within 1e-12.
Run: .venv/bin/python parity/compare/compare_jsc370.py"""

import json
import lzma
import sys
from collections import Counter
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import JSC370_CENSUS_FEATURES, JSC370_COLUMNS, jsc370_legacy

INCOME_TOL = 1e-12


def load_r() -> pd.DataFrame:
    with lzma.open(ROOT / "parity/r_outputs/jsc370/final_data.csv.xz", "rt") as fh:
        r = pd.read_csv(fh, dtype=str, keep_default_na=False)
    r["Robbery"] = r["Robbery"] == "TRUE"
    for col in set(JSC370_COLUMNS) - {"Robbery", "Premises_Type", "Season"}:
        r[col] = r[col].astype("float64")
    return r


def compare() -> dict:
    r, py = load_r(), jsc370_legacy()
    report = {
        "rows_r": len(r),
        "rows_py": len(py),
        "robberies_r": int(r["Robbery"].sum()),
        "robberies_py": int(py["Robbery"].sum()),
    }
    key = list(JSC370_COLUMNS)  # full-row multiset, floats compared exactly
    mr = Counter(map(tuple, r[key].itertuples(index=False)))
    mp = Counter(map(tuple, py[key].itertuples(index=False)))
    report["key_multiset_equal"] = mr == mp
    # With identical keys, compare every census feature on the sorted rows.
    a = r.sort_values(key, kind="stable").reset_index(drop=True)
    b = py.sort_values(key, kind="stable").reset_index(drop=True)
    for col in JSC370_CENSUS_FEATURES:
        denom = a[col].abs().clip(lower=1.0)
        report[col + "_max_rel_diff"] = float(((a[col] - b[col]).abs() / denom).max())
    report["row_order_equal"] = bool((r[JSC370_COLUMNS].values == py[JSC370_COLUMNS].values).all())
    report["neighbourhoods_matched"] = int(
        jsc370_legacy(keep_neighbourhood=True)["Neighbourhood"].nunique()
    )
    return report


if __name__ == "__main__":
    rep = compare()
    print(json.dumps(rep, indent=1))
    ok = (
        rep["rows_r"] == rep["rows_py"] == 16_611
        and rep["robberies_r"] == rep["robberies_py"] == 2_779
        and rep["key_multiset_equal"]
        and rep["row_order_equal"]
        and rep["neighbourhoods_matched"] == 158
        and all(v <= INCOME_TOL for k, v in rep.items() if k.endswith("_max_rel_diff"))
    )
    print("PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)
