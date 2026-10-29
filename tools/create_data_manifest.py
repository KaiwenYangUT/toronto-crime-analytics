"""One-time baseline capture from the agreed Git snapshot, never automatic on fetch."""

import csv
import hashlib
import json
import subprocess
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "_reference/robbery"
COMMIT = "4af4309b904f853fefe5ca84cce6d53d2820a588"


def main() -> None:
    target = ROOT / "data/manifest.json"
    if target.exists():
        raise SystemExit("Manifest already exists; do not silently reset integrity expectations.")
    actual = subprocess.check_output(
        ["git", "-C", str(REFERENCE), "rev-parse", "HEAD"], text=True
    ).strip()
    if actual != COMMIT:
        raise SystemExit(f"Wrong reference commit: {actual}")
    files = []
    for path in sorted((REFERENCE / "data").iterdir()):
        if path.suffix not in (".csv", ".xlsx"):
            continue
        committed = subprocess.check_output(
            ["git", "-C", str(REFERENCE), "show", f"{COMMIT}:data/{path.name}"]
        )
        if committed != path.read_bytes():
            raise SystemExit(f"Reference file differs from Git snapshot: {path.name}")
        if path.suffix == ".csv":
            with path.open(encoding="utf-8-sig", newline="") as stream:
                reader = csv.reader(stream)
                header = next(reader)
                rows = sum(1 for _ in reader)
            source = "tps"
        else:
            workbook = load_workbook(path, read_only=True)
            sheet = workbook.worksheets[0]
            rows = sheet.max_row - 1
            header = [None] * sheet.max_column
            workbook.close()
            source = "city"
        files.append(
            {
                "file": path.name,
                "source": source,
                "bytes": len(committed),
                "rows": rows,
                "columns": len(header),
                "md5": hashlib.md5(committed).hexdigest(),
                "sha256": hashlib.sha256(committed).hexdigest(),
            }
        )
    manifest = {
        "schema_version": 1,
        "captured": "2026-10-29",
        "provenance": "Hashes verified against Git blobs at the agreed commit; original publisher download date unknown. CSV rows exclude header; XLSX rows exclude first-sheet header.",
        "commit": COMMIT,
        "reference": "_reference/robbery/data",
        "snapshot_url": f"https://raw.githubusercontent.com/KaiwenYangUT/Robbery_Crime_Classification/{COMMIT}/data/",
        "sources": {
            "tps": "https://data.torontopolice.on.ca/pages/open-data",
            "city": "https://open.toronto.ca/dataset/neighbourhood-profiles/",
        },
        "files": files,
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Captured {len(files)} inputs; manifest {target.stat().st_size} bytes")


if __name__ == "__main__":
    main()
