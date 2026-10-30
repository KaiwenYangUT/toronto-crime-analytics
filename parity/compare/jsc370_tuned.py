"""Python-tuned row for the JSC370 models (CV on the training frame; labelled in PARITY.md).
Slow (about 10 minutes). Run: .venv/bin/python parity/compare/jsc370_tuned.py"""

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline" / "src"))
from tca.predict import jsc370_port as j
from tca.predict.tuning import tuned_rows

if __name__ == "__main__":
    start = time.time()
    train, test = j.load_r_frames()
    rows = tuned_rows(train, test)
    rows["r_best_tune"] = j.r_json("xgb_summary.json")["best_tune"]
    rows["seconds"] = round(time.time() - start)
    path = ROOT / "parity/reports/jsc370_tuned.json"
    path.write_text(json.dumps(rows, indent=1) + "\n")
    print(json.dumps({k: rows[k] for k in ("xgb", "rf", "gbm")}, indent=1)[:1800])
