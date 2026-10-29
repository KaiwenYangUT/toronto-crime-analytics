"""Write the unified table's exclusion ledger (every rule's row counts, per class) to
parity/reports/unified_ledger.json. Run: .venv/bin/python parity/compare/unified_ledger.py"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.build import CROSS_CATEGORY_RULES, unified

out = {}
for rule in CROSS_CATEGORY_RULES:
    df, ledger = unified(cross_category=rule)
    ledger["final_rows"] = len(df)
    ledger["final_robbery"] = int(df["robbery"].sum())
    out[rule] = ledger
path = ROOT / "parity/reports/unified_ledger.json"
path.write_text(json.dumps(out, indent=1) + "\n")
print(f"wrote {path.relative_to(ROOT)}")
