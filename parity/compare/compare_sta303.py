"""Compare tca.build.sta303_legacy with the R model frame (exported in P2).
Run: .venv/bin/python parity/compare/compare_sta303.py"""

import json
import lzma
import struct
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import sta303_legacy


def bits(x: float) -> int:
    return struct.unpack("<q", struct.pack("<d", x))[0]


def compare() -> dict:
    with lzma.open(ROOT / "parity/r_outputs/sta303/model_frame.csv.xz", "rt") as fh:
        r = pd.read_csv(fh, dtype=str, keep_default_na=False)
    py = sta303_legacy()
    report = {"rows_r": len(r), "rows_py": len(py)}
    if len(r) != len(py):
        return report
    for col in ("Crime_Category", "Neighbourhood", "Location_Type", "Premises_Type", "Season"):
        report[col + "_equal"] = bool((r[col].values == py[col].values).all())
    report["Occurrence_Time_equal"] = bool(
        (
            r["Occurrence_Time"].values
            == py["Occurrence_Time"].dt.strftime("%Y-%m-%d %H:%M:%S").values
        ).all()
    )
    for col in (
        "Robbery",
        "Year",
        "Month",
        "Day_Of_Week_Numeric",
        "Hour",
        "Presence_of_Sunset",
        "Covid_Outbreak",
    ):
        report[col + "_equal"] = bool(
            (r[col].astype(float).values == py[col].astype(float).values).all()
        )
    for col in ("Longitude", "Latitude"):
        report[col + "_bit_differences"] = sum(
            bits(float(a)) != bits(b) for a, b in zip(r[col], py[col])
        )
    report["class_counts"] = py["Crime_Category"].value_counts().to_dict()
    return report


if __name__ == "__main__":
    rep = compare()
    print(json.dumps(rep, indent=1))
    ok = (
        rep["rows_r"] == rep["rows_py"] == 174_976
        and all(v is True for k, v in rep.items() if k.endswith("_equal"))
        and all(v == 0 for k, v in rep.items() if k.endswith("_bit_differences"))
    )
    print("PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)
